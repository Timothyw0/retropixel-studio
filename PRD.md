# Retro Pixel Painter - Product Requirements Document

Create a nostalgic pixel art creation tool that captures the essence of classic paint programs from the 1990s.

**Experience Qualities**: 
1. **Nostalgic** - Evoke memories of classic MS Paint and early digital art tools through authentic retro styling
2. **Precise** - Enable pixel-perfect control with clear grid lines and exact positioning feedback
3. **Playful** - Encourage creativity through intuitive tools and satisfying interactions

**Complexity Level**: Light Application (multiple features with basic state)
- Multiple drawing tools with distinct behaviors, palette management, import/export functionality, and persistent storage

## Essential Features

**Canvas System**
- Functionality: Fixed pixel grid (32x32 default) with zoom levels (1x-8x), drawing tools (pencil, eraser, fill, line, rectangle, circle)
- Purpose: Core drawing surface for pixel art creation with precision controls
- Trigger: User selects tool and clicks/drags on canvas
- Progression: Tool selection → Canvas interaction → Real-time pixel updates → Visual feedback
- Success criteria: Smooth drawing experience with pixel-perfect accuracy and responsive zoom

**Color Palette**
- Functionality: 16-color preset swatches plus 2 custom color slots, eyedropper tool, foreground/background color swap
- Purpose: Quick color selection and management for consistent artwork
- Trigger: Click on color swatch or use eyedropper on canvas
- Progression: Color selection → Active color indicator → Apply to drawing tools → Visual confirmation
- Success criteria: Instant color switching with clear active color indication

**Editing Operations**
- Functionality: Undo/redo stack, copy/paste selections, flip/rotate transforms, clear canvas
- Purpose: Enable iterative artwork creation and correction
- Trigger: Keyboard shortcuts or toolbar buttons
- Progression: Action trigger → Operation execution → Canvas update → History stack update
- Success criteria: Reliable operation history with instant visual feedback

**Retro UI Shell**
- Functionality: '90s-style window frame with draggable title bar, toolbar with icon buttons, tooltip hints
- Purpose: Immersive nostalgic experience that enhances usability
- Trigger: User interaction with window elements
- Progression: Hover/click → Visual state change → Action execution → UI feedback
- Success criteria: Authentic retro appearance with modern usability standards

**Import/Export System**
- Functionality: PNG import with palette quantization, PNG/sprite sheet export, localStorage persistence
- Purpose: Enable artwork sharing and project continuity
- Trigger: File selection or export button click
- Progression: File selection → Processing → Canvas update/file download → User confirmation
- Success criteria: Seamless file handling with format preservation

## Edge Case Handling
- **Large File Import**: Automatically resize or crop oversized images to fit canvas dimensions
- **Unsupported Formats**: Display clear error messages with format requirements
- **Storage Limits**: Gracefully handle localStorage quota exceeded with user notification
- **Invalid Operations**: Disable unavailable actions (undo when no history, paste when no clipboard)
- **Zoom Boundaries**: Prevent zoom levels that would cause performance issues or UI breaking

## Design Direction
The interface should feel authentically retro and nostalgic, reminiscent of classic MS Paint and early digital art tools, with deliberate pixelated elements and '90s UI paradigms while maintaining modern usability standards.

## Color Selection
Custom palette inspired by classic 16-color VGA palette with enhanced usability.

- **Primary Color**: Classic Windows blue `oklch(0.5 0.2 240)` - Communicates nostalgia and trust
- **Secondary Colors**: Window chrome grays `oklch(0.85 0 0)` for backgrounds, `oklch(0.7 0 0)` for borders
- **Accent Color**: Bright selection orange `oklch(0.7 0.25 45)` for active tools and highlights
- **Foreground/Background Pairings**: 
  - Background (Light Gray): Dark text `oklch(0.85 0 0)`: `oklch(0.2 0 0)` - Ratio 8.2:1 ✓
  - Primary (Windows Blue): White text `oklch(0.5 0.2 240)`: `oklch(1 0 0)` - Ratio 4.8:1 ✓
  - Accent (Orange): Black text `oklch(0.7 0.25 45)`: `oklch(0 0 0)` - Ratio 9.1:1 ✓

## Font Selection
Monospace typography should evoke classic system fonts with pixel-perfect clarity for technical precision and retro authenticity.

- **Typographic Hierarchy**: 
  - H1 (Window Title): Monaco Bold/14px/normal letter spacing
  - Body (UI Labels): Monaco Regular/12px/normal letter spacing  
  - Small (Status Bar): Monaco Regular/11px/tight letter spacing

## Animations
Minimal and functional animations that enhance feedback without breaking the retro aesthetic - subtle button presses and tool state changes only.

- **Purposeful Meaning**: Micro-animations should feel like authentic system responses from classic operating systems
- **Hierarchy of Movement**: Tool selection and canvas operations deserve subtle feedback, decorative elements should remain static

## Component Selection
- **Components**: Custom retro-styled components over shadcn to maintain authentic '90s appearance
- **Customizations**: Window chrome, toolbar buttons, color swatches, canvas container all need period-appropriate styling
- **States**: Distinct pressed/unpressed states for all interactive elements with authentic 3D button effects
- **Icon Selection**: Custom pixel art icons for tools, simple geometric shapes that scale cleanly
- **Spacing**: Tight spacing typical of classic UIs with 2-4px gaps between elements
- **Mobile**: Stack toolbar vertically on small screens, maintain canvas as primary focus with gesture support