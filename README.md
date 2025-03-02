# ✨ The Jar Game ✨

A beautiful browser-based game where players open jars to discover their contents - find tasty marmalade for points, but watch out for worms!

![Jar Game Screenshot](https://via.placeholder.com/800x400/5f2eea/FFFFFF?text=Jar+Game)

## 🎮 Game Rules

- There are 20 jars in each round, but you can only open 10
- If you find worms (🪱): -5 points (with sad trombone sound!)
- If you find orange marmalade (🍊): +3 points
- If you find lemon marmalade (🍋): +2 points
- Each round has different ratios of jars containing worms vs marmalade
- Your highest score is saved locally

## 🚀 Features

- Smooth animations for opening jars and score effects
- Sound effects for various game events
- Beautiful UI with modern design elements
- Responsive layout that works on mobile and desktop
- High score tracking using localStorage
- Engaging visual feedback when finding items

## 🎯 How to Play

1. Open `index.html` in your browser
2. Click on jars to open them and discover their contents
3. Try to maximize your score by finding marmalade and avoiding worms
4. After opening 10 jars, the round ends
5. Click "Next Round" to start a new round with different jar distributions
6. See how high you can get your score!

## 🔄 Round Distributions

The game has different jar distributions in each round:

1. Round 1: Balanced (7 worms, 7 orange, 6 lemon)
2. Round 2: More worms (10 worms, 5 orange, 5 lemon)
3. Round 3: More orange marmalade (5 worms, 10 orange, 5 lemon)
4. Round 4: More lemon marmalade (5 worms, 5 orange, 10 lemon)
5. Round 5: Very risky (15 worms, 3 orange, 2 lemon)
6. Rounds 6+: Random distributions for endless gameplay

## 🛠️ Customization

Feel free to modify the game by:
- Changing the scoring system in `script.js`
- Adjusting the jar distributions for each round
- Styling the game differently in `styles.css`
- Adding new jar contents and animations

## 🌟 Technologies Used

- HTML5
- CSS3 (animations, transitions, Flexbox, CSS Grid)
- JavaScript (ES6+)
- Web Audio API for sound effects
- Local Storage API for high score persistence
- Font Awesome icons for UI elements

## 📱 Responsive Design

The game works well on various screen sizes:
- Desktop: Full grid display (5 jars per row)
- Tablet: Adjusted grid (4 jars per row)
- Mobile: Compact layout (3 jars per row)

## 🙏 Credits

- Sound effects from [SoundBible](https://soundbible.com)
- Fonts from Google Fonts
- Icons from Font Awesome