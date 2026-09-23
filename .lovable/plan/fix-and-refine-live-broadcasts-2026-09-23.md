# Fix and refine live broadcasts

## What will change
- Prevent one creator from having more than one active live, including concurrent start attempts, and close any duplicate active sessions already present.
- Keep each creator's active broadcast visible once in the Live tab and send them back into that broadcast if they tap Go Live again.
- Rework the live room into a host-led guest grid inspired by the reference: host identity, live/viewer status and gifts at the top; host plus up to eight guest tiles; chat over the lower portion; controls along the bottom.
- Make double-tap likes work on touchscreens as well as desktop, with visible heart feedback.
- Keep camera/microphone controls for all participants and give the host clear Camera/Share screen and End live controls.
- Verify the live list and room on desktop and mobile-sized screens, then resolve current compile errors that block the preview.

## Technical details
- Add a database uniqueness safeguard for one active session per host and make `start_live` safe against simultaneous requests.
- Deduplicate active sessions client-side as a defensive display measure.
- Preserve the existing WebRTC and realtime chat/gift systems, changing only source switching reliability and presentation.
- Add route-specific page metadata for the Live list and Live room.
