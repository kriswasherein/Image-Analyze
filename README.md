# Fluid Mechanics Image Analyzer

A lightweight, browser-only, ImageJ-inspired image analysis webapp designed around experimental fluid mechanics.

## Current prototype

### Image handling
- Add a sequence of experimental images.
- Supports browser-readable BMP, PNG, JPG/JPEG, TIFF (where the browser supports it), WebP and other `image/*` formats.
- First image is treated as the reference/calibration image.

### Calibration
- Draw a line on the reference image.
- Enter the known physical length and unit.
- The app calculates pixels per physical unit.
- Units include µm, mm, cm, m, km and inch.
- A calibration line can be marked as the calibration object.

### Measurements
The prototype includes:
- Length
- Diameter
- Radius
- Height
- Contact angle
- Area
- Point/reference
- Surface/interface object definition

Objects have a name and can be marked:
- `Measure in subsequent images`
- `Lock definition`

This makes workflows such as:

1. Needle → calibration → 1.6 mm
2. Oil drop → diameter → measure
3. Water drop → diameter → measure
4. Oil/water interface → surface/reference
5. Contact-angle line → angle → measure

possible from the same reference frame.

### Automatic processing
The prototype contains a transparent browser-side tracking assist:
- It starts from the geometry defined in the first frame.
- It searches later frames for a similar local RGB patch.
- It estimates translation of the object.
- It repeats the selected measurement.
- It reports a confidence value.

This is deliberately an assist rather than a claim of fully automatic segmentation. For serious quantitative experiments, representative frames should be checked manually.

## Run locally

No build system is required.

Open `index.html` in a modern browser.

For GitHub Pages:
1. Create a repository.
2. Upload the contents of this folder.
3. Enable GitHub Pages from repository settings.
4. Open the published page.

## Recommended next development stage

For a research-grade fluid-mechanics version, add:

1. **ROI/object templates**
   - Save a rectangular or polygonal ROI around each object.
   - Store RGB/HSV/Lab statistics.
   - Store edge gradients and shape descriptors.

2. **Robust object tracking**
   - Template matching at multiple scales.
   - Normalized cross-correlation.
   - Optical-flow-assisted motion estimation.
   - Contour propagation.
   - Confidence and automatic re-detection when tracking fails.

3. **Fluid-specific segmentation**
   - Oil/water/air segmentation.
   - Background subtraction.
   - Canny/Sobel edge detection.
   - Thresholding in RGB/HSV/Lab.
   - Morphological cleanup.
   - Connected components.
   - Contour extraction.

4. **Scientific geometry**
   - Equivalent diameter.
   - Horizontal and vertical diameter.
   - Spherical-cap fitting.
   - Contact diameter.
   - Height.
   - Contact angle from local interface fitting.
   - Interface area.
   - Curvature.
   - Centre of mass.
   - Compound-drop outer contour.

5. **Experiment metadata**
   - Experiment name
   - Fluid names
   - Density
   - Dynamic viscosity
   - Surface/interfacial tension
   - Needle gauge
   - Drop diameter
   - Impact height
   - Frame rate
   - Pixel calibration
   - Temperature
   - Weber/Reynolds/Ohnesorge/Bond numbers

6. **Batch output**
   - CSV
   - JSON project
   - Annotated images
   - Time series
   - Per-object plots
   - Dimensionless quantities

## Important research note

Automatic image analysis should preserve the raw image and the manually defined reference geometry. Every automatic result should be traceable to:
- original image
- object definition
- algorithm
- calibration
- confidence
- manual correction, if any

That makes the workflow much more defensible for experimental-fluid-mechanics publications.
