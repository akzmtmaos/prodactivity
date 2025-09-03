# Floating Timer Feature

## Overview
The floating timer is a persistent timer widget that appears across all pages when a study timer is active. It allows users to continue working on other parts of the app while maintaining their Pomodoro rhythm.

## Features

### 🎯 **Persistent Across Pages**
- Timer continues running when navigating between Home, Notes, Tasks, Decks, etc.
- Never lose track of your study sessions
- Seamless workflow integration

### 🎮 **Interactive Controls**
- **Play/Pause**: Start or pause the current timer
- **Reset**: Reset to the beginning of the current session
- **Stop**: Completely stop the timer and hide the widget
- **Minimize/Maximize**: Toggle between compact and full view

### 📱 **Responsive Design**
- **Expanded View**: Full timer display with controls and session info
- **Minimized View**: Compact display showing just time remaining
- **Draggable**: Click and drag to reposition anywhere on screen

### 🔊 **Audio Notifications**
- Pleasant sound when study sessions complete
- Different sound for break transitions
- Helps maintain focus without visual distractions

### 🎨 **Visual Indicators**
- **Blue**: Study time sessions
- **Green**: Break time sessions
- **Session counter**: Shows current session number
- **Time remaining**: Large, easy-to-read countdown

## How to Use

### Starting a Timer
1. Go to the **Study Timer** page
2. Configure your settings (or use Pomodoro mode)
3. Click **Start** to begin your session
4. The floating timer will appear automatically

### Using the Floating Timer
- **Navigate freely** between pages - the timer stays visible
- **Click and drag** to reposition the widget
- **Minimize** to save screen space while keeping track
- **Control** your session without returning to the timer page

### Timer States
- **Study Time**: Blue indicator, counts down study duration
- **Break Time**: Green indicator, counts down break duration
- **Long Break**: Extended break after completing multiple sessions

## Technical Implementation

### Components
- `FloatingTimer.tsx`: Main floating widget component
- `TimerWidget.tsx`: Wrapper that conditionally renders the floating timer
- `TimerContext.tsx`: Global timer state management
- `audioUtils.ts`: Sound notification utilities

### State Management
- Uses React Context for global timer state
- Persists settings in localStorage
- Maintains session logs across app restarts
- Handles automatic session transitions

### Integration
- Wrapped in `TimerProvider` at the app level
- Rendered in `PrivateRoute` for authenticated users
- Automatically shows/hides based on timer activity

## Benefits

1. **Improved Productivity**: No need to switch back to timer page
2. **Better Focus**: Maintain Pomodoro rhythm while working
3. **Seamless UX**: Timer follows you throughout the app
4. **Visual Reminder**: Always know your current session status
5. **Flexible Positioning**: Place timer where it doesn't interfere

## Future Enhancements

- [ ] Browser notifications when timer completes
- [ ] Customizable timer sounds
- [ ] Timer statistics and analytics
- [ ] Integration with task completion
- [ ] Mobile-optimized touch controls
