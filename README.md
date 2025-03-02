# Paddington's 3D Marmalade Hunt

A delightful 3D game where you control Paddington Bear as he searches for his beloved marmalade by opening jars. This project transforms the classic jar game into an immersive 3D experience using Three.js with a controllable character.

## Game Rules

1. Control Paddington to find marmalade by opening jars in a 3D environment
2. Each round has 20 jars, but you can only open 10
3. Different jars contain different prizes:
   - Orange Marmalade: +5 points
   - Lemon Marmalade: +3 points
   - Worms: -5 points 
   - Special Marmalade Sandwich: +10 points (rare treat!)
4. Your score persists between rounds for a high score challenge
5. Each "Adventure" has a unique distribution of jar contents

## Features

- Control Paddington Bear with WASD or arrow keys
- Character animations for walking, idling, and finding marmalade
- Simple keyboard-only controls: just move with WASD to interact
- Full 3D environment with interactive jars
- Realistic jar opening animations and physics
- Dynamic lighting and post-processing effects
- Immersive scene with Paddington-themed decorations
- Visual feedback for user interactions
- Confetti celebration for high scores
- Responsive design that works on various screen sizes
- Authentic Paddington Bear color scheme and theme
- Web Audio API sound effects

## Technical Details

- Built with Three.js for 3D rendering
- Uses post-processing for bloom and lighting effects
- Custom 3D models and materials
- Raycaster for 3D object interaction
- Responsive design using CSS media queries
- Custom animations for smooth transitions
- Web Audio API for sound generation

## Adventures

Paddington goes on different marmalade-hunting adventures, each with a different jar distribution:

1. **Paddington's First Adventure**: A balanced mix of marmalade and worms
2. **Paddington at the Garden**: More worms to avoid!
3. **Paddington Visits the Pantry**: Plenty of orange marmalade
4. **Paddington's Tea Time**: Extra lemon marmalade and a better chance for sandwiches
5. **Paddington's Adventure in the Garden Shed**: Very risky with lots of worms
6. **Paddington Explores the World**: Random distribution for unlimited play

## How to Play

1. Moving Paddington:
   - Use WASD or arrow keys to move Paddington around the scene
   - The controls are relative to the camera view (W always moves forward from your perspective)
   - Paddington will automatically animate as he moves

2. Opening Jars:
   - Simply walk up to any jar to open it automatically
   - When close to a jar, it will glow to indicate it can be opened
   - Paddington will turn to face and open the jar automatically
   - Watch Paddington's animations as he discovers marmalade or worms

3. General Gameplay:
   - Try to maximize your score by finding the best jars
   - Each round has 20 jars, but you can only open 10
   - Complete adventures to unlock new challenges with different jar distributions