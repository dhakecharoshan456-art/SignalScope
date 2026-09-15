# SignalScope Forensic Methodology & Algorithmic Blueprint

> **System**: SignalScope Multimodal Media Forensics Platform  
> **Target Framework**: PyTorch, Torchvision, Hugging Face Transformers, SciPy, NumPy  
> **Production Model**: Swin-v2 AI Image Detector (`umm-maybe/AI-image-detector`)

---

## 1. Deep Vision Backbone (Swin-v2 Transformer)

SignalScope uses the **Swin Transformer v2** architecture as its primary visual classifier.
- **Backbone Type**: Hierarchical Vision Transformer with Shifted Windows.
- **Input Resolution**: $224 \times 224 \times 3$ RGB.
- **Preprocessing Pipeline**:
  $$\text{Input Image} \longrightarrow \text{Resize}(224) \longrightarrow \text{CenterCrop}(224) \longrightarrow \text{Normalize}(\mu, \sigma)$$
  where $\mu = [0.485, 0.456, 0.406]$ and $\sigma = [0.229, 0.224, 0.225]$.
- **Probability Output**:
  Logits are converted to continuous probabilities via softmax:
  $$p_{\text{ai}} = \frac{e^{z_{\text{ai}}}}{e^{z_{\text{ai}}} + e^{z_{\text{real}}}}, \quad p_{\text{real}} = 1.0 - p_{\text{ai}}$$
  Probabilities are bounded strictly within $[0.001, 0.998]$ to reflect probabilistic inference.

---

## 2. Spatial-Frequency 2D-FFT Spectral Analysis

Synthetic diffusion and GAN generators leave distinct spectral energy signatures due to upsampling and latent sampling steps.

### Mathematical Formulation
1. Convert RGB image to grayscale luminance $I(x, y)$.
2. Compute 2D Fast Fourier Transform with DC component shifted to center:
   $$F(u, v) = \text{fftshift}\left(\sum_{x=0}^{M-1} \sum_{y=0}^{N-1} I(x, y) e^{-j 2\pi \left(\frac{ux}{M} + \frac{vy}{N}\right)}\right)$$
3. Compute logarithmic magnitude spectrum:
   $$S(u, v) = \log(|F(u, v)| + \epsilon)$$
4. Compute radial frequency masks for High-Frequency ($HF$) and Low-Frequency ($LF$) zones:
   $$r(u, v) = \sqrt{(u - u_0)^2 + (v - v_0)^2}, \quad r_{\text{max}} = \sqrt{u_0^2 + v_0^2}$$
   $$HF = \{ (u, v) \mid r(u, v) > 0.35 \cdot r_{\text{max}} \}$$
   $$LF = \{ (u, v) \mid r(u, v) \le 0.35 \cdot r_{\text{max}} \}$$
5. The radial spectral energy ratio is:
   $$\text{Ratio}_{\text{FFT}} = \frac{\frac{1}{|HF|} \sum_{(u, v) \in HF} S(u, v)}{\frac{1}{|LF|} \sum_{(u, v) \in LF} S(u, v) + \epsilon}$$
Natural optical images follow a standard $1/f^\alpha$ power-law decay. Significant divergence triggers the `FFT Spectrum Anomaly` signal.

---

## 3. High-Pass Laplacian Sensor Noise Residual (PRNU)

Physical camera hardware produces characteristic **Photo Response Non-Uniformity (PRNU)** and Poisson sensor shot noise. Latent diffusion decoders produce smoothed spatial pixel residuals lacking natural sensor noise.

### Mathematical Formulation
1. Convolve luminance image $I(x, y)$ with a discrete 2D Laplacian operator:
   $$L(x, y) = \nabla^2 I(x, y) = \frac{\partial^2 I}{\partial x^2} + \frac{\partial^2 I}{\partial y^2}$$
2. Compute spatial residual variance:
   $$\sigma^2_{\text{noise}} = \text{Var}(L(x, y))$$
3. Normalized noise deficit score:
   $$S_{\text{noise}} = \text{clip}\left(1.0 - \frac{\sigma^2_{\text{noise}}}{1200.0}, 0.10, 0.95\right)$$
Elevated scores indicate a deficit of natural sensor shot noise.

---

## 4. Local Spatial Texture & Boundary Energy

Generative models frequently produce subtle boundary blending and micro-texture repetition along high-contrast transitions.

### Mathematical Formulation
1. Compute horizontal and vertical Sobel spatial gradients:
   $$G_x = \begin{bmatrix} -1 & 0 & 1 \\ -2 & 0 & 2 \\ -1 & 0 & 1 \end{bmatrix} * I, \quad G_y = \begin{bmatrix} -1 & -2 & -1 \\ 0 & 0 & 0 \\ 1 & 2 & 1 \end{bmatrix} * I$$
2. Compute gradient magnitude:
   $$G(x, y) = \sqrt{G_x(x, y)^2 + G_y(x, y)^2}$$
3. Average texture gradient energy:
   $$\bar{G} = \frac{1}{M \cdot N} \sum_{x, y} G(x, y)$$
4. Texture anomaly score:
   $$S_{\text{texture}} = \text{clip}\left(\frac{\bar{G}}{80.0}, 0.10, 0.95\right)$$

---

## 5. Model-Guided Saliency & Attention Map Generation

To avoid misleading radial approximations, SignalScope computes a genuine **$32 \times 32$ spatial attention saliency matrix** directly from pixel feature gradients:
1. Downsample input to $64 \times 64$ luminance matrix.
2. Compute spatial gradients via Sobel convolution.
3. Apply isotropic Gaussian smoothing ($\sigma = 1.5$).
4. Downsample to a $32 \times 32$ floating-point grid normalized strictly between $[0.0, 1.0]$.
5. Stream the matrix via JSON in `/api/detect`.
6. Client-side canvas renders this grid directly with bilinear interpolation and alpha transparency.

---

## 6. Uncertainty Safety Band & Decision Calibration

To prevent catastrophic false positives on ambiguous or compressed media, SignalScope enforces a calibrated three-tier decision structure:

$$\text{Verdict}(p_{\text{ai}}) = \begin{cases}
\text{LIKELY REAL}, & p_{\text{ai}} < 0.42 \\
\text{UNCERTAIN (Safety Band)}, & 0.42 \le p_{\text{ai}} \le 0.58 \\
\text{LIKELY AI-GENERATED}, & p_{\text{ai}} > 0.58
\end{cases}$$

- **Threshold**: $0.50$
- **Uncertainty Margin**: $\pm 0.08$
- Borderline samples trigger human review in the audit history queue rather than an automated accusation.

---

## 7. Dynamic Perturbation Robustness Testing

The live `/api/robustness-test` endpoint calculates detector stability on-the-fly across 4 actual image corruptions:
1. **JPEG Compression**: Re-encodes image buffer at $Q=50$.
2. **Downscaling**: Shrinks dimensions by $50\%$ and restores via bilinear upsampling.
3. **Screenshot Simulation**: Applies Gaussian display defocus blur ($\sigma=0.8$) and recompression ($Q=75$).
4. **Center Crop**: Crops $90\%$ of center field-of-view.

Stability score for each transformation:
$$\text{Stability}_k = \max\left(0.0, 100.0 - |p_{\text{ai}}^{(k)} - p_{\text{ai}}^{(\text{orig})}| \times 100.0\right)$$
Mean stability is reported to the user as empirical evidence.

---

## 8. C2PA Provenance & Fusion Policy

SignalScope inspects EXIF and C2PA Content Credentials headers.
- **State 1**: `C2PA Manifest Not Detected`
- **State 2**: `C2PA Manifest Detected (Unverified / Self-signed)`
- **State 3**: `C2PA Cryptographically Verified (Hardware Root of Trust)`

### Fusion Policy Rule
> **Visual & Frequency Residuals Take Precedence**: Because web platforms (e.g. Twitter, WhatsApp) routinely strip metadata during re-compression, absence of C2PA metadata alone **never proves synthetic origin**. The neural backbone and frequency measurements serve as the primary truth source.
