# Paddington's Marmalade Hunt

A charming Paddington-themed browser game where players help the beloved bear find his favorite marmalade jars while avoiding worms! Inspired by Paddington Bear's love for marmalade sandwiches and his endearing charm.

![Paddington's Marmalade Hunt](https://via.placeholder.com/800x400/0051A8/FFFFFF?text=Paddington%27s+Marmalade+Hunt)

## Game Rules

- Help Paddington search through 20 jars in each adventure, but you can only open 10
- If you find worms: -5 points (Paddington doesn't like these!)
- If you find orange marmalade: +5 points (Paddington's favorite!)
- If you find lemon marmalade: +3 points (A tasty alternative)
- If you find a marmalade sandwich: +10 points (Paddington's special treat!)
- Each adventure has different ratios of jars containing worms vs marmalade
- Your highest score is saved locally as Paddington's record

## Features

- Paddington-themed visuals with his iconic blue coat and red hat colors
- Smooth animations for opening jars and score effects
- Custom Web Audio API sound effects for all game events
- Responsive layout that works on mobile and desktop
- High score tracking using localStorage
- SVG illustrations of Paddington and marmalade jars
- Engaging visual feedback when finding items

## How to Play

1. Open `index.html` in your browser
2. Click on jars to open them and discover their contents
3. Try to maximize your score by finding marmalade and avoiding worms
4. After opening 10 jars, Paddington's adventure ends
5. Click "Next Adventure" to start a new adventure with different jar distributions
6. See how many marmalade jars you can collect for Paddington!

## Paddington's Adventures

Each adventure has a unique story and jar distribution:

1. Adventure #1: Paddington's First Adventure (7 worms, 7 orange, 5 lemon, 1 sandwich)
2. Adventure #2: Paddington at the Garden (10 worms, 5 orange, 4 lemon, 1 sandwich)
3. Adventure #3: Paddington Visits the Pantry (5 worms, 9 orange, 5 lemon, 1 sandwich)
4. Adventure #4: Paddington's Tea Time (5 worms, 5 orange, 8 lemon, 2 sandwiches)
5. Adventure #5: Paddington's Garden Shed Exploration (14 worms, 3 orange, 2 lemon, 1 sandwich)
6. Adventures 6+: Paddington Explores the World (random distributions for endless adventures)

## Customization

Feel free to modify the game by:
- Changing the scoring system in `script.js`
- Adjusting the jar distributions for each adventure
- Styling the game differently in `styles.css` 
- Adding new jar contents and animations
- Creating more Paddington-themed visual elements

## Technologies Used

- HTML5
- CSS3 (animations, transitions, Flexbox, CSS Grid)
- JavaScript (ES6+)
- SVG for Paddington-themed icons and illustrations
- Web Audio API for all sound effects
- Local Storage API for high score persistence
- Font Awesome icons for UI elements
- Custom Paddington-themed color palette (blue coat, red hat, marmalade colors)

## Responsive Design

The game adapts to different screen sizes:
- Desktop: Full grid display (5 jars per row)
- Tablet: Adjusted grid (4 jars per row)
- Mobile: Compact layout (3 jars per row)

## Credits

- Inspired by the beloved Paddington Bear character
- Fonts from Google Fonts (Poppins and Fredoka One)
- Icons from Font Awesome
- Custom SVG illustrations and sound effects created for this game