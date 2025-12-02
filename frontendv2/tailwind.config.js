import uiPreset from '@mirubato/ui/tailwind.preset'

/** @type {import('tailwindcss').Config} */
export default {
  // Use @mirubato/ui preset as base
  presets: [uiPreset],
  content: [
    './index.html',
    './src/**/*.{js,ts,jsx,tsx}',
    // Include @mirubato/ui components for Tailwind to scan
    '../packages/ui/src/**/*.{js,ts,jsx,tsx}',
  ],
  // Frontendv2-specific overrides (if any needed in future)
  theme: {
    extend: {},
  },
  plugins: [],
  safelist: [
    // Metronome sound layer colors
    'bg-morandi-purple-400',
    'bg-morandi-sky-400',
    'bg-morandi-sage-400',
    'bg-morandi-sand-400',
    'bg-morandi-blush-400',
    // Circle of Fifths piano keyboard colors
    'bg-morandi-rose-200',
    'bg-morandi-rose-300',
    'text-morandi-rose-500',
    'bg-morandi-peach-200',
    'text-morandi-peach-500',
    'bg-morandi-sage-400',
    'text-morandi-sage-500',
    'text-morandi-sage-600',
    'accent-morandi-sage-500',
    'bg-morandi-stone-400',
    'bg-morandi-stone-500',
    'bg-morandi-stone-600',
    'bg-morandi-stone-700',
    // Key details panel colors
    'bg-morandi-sage-100',
    'bg-morandi-sage-300',
    'bg-morandi-rose-300',
    'bg-morandi-peach-300',
    'bg-morandi-sky-300',
    'bg-morandi-sand-300',
    'bg-morandi-purple-50',
    'text-morandi-purple-500',
    'bg-morandi-purple-300',
    'text-morandi-purple-400',
    'border-morandi-purple-300',
    'border-morandi-sage-300',
    'border-morandi-rose-300',
    'border-morandi-peach-300',
    'border-morandi-sky-300',
    'border-morandi-sand-300',
    // Status bars for pieces and repertoire statuses
    'bg-morandi-navy-600', // Polished (darkest)
    'bg-morandi-navy-500', // (unused but kept for backward compatibility)
    'bg-morandi-navy-400', // Learning (medium)
    'bg-morandi-navy-300', // Planned (lightest)
    'bg-gray-300', // Dropped/default
    // Technique tag colors
    'bg-morandi-blush-100',
    'bg-morandi-peach-100',
    'bg-sand-100',
    'text-sand-800',
    // Summary stats colors
    'bg-morandi-stone-50',
    'bg-morandi-stone-100',
    'bg-morandi-rose-50',
    // Type badge colors for practice entry types
    'bg-morandi-purple-200',
    'text-morandi-purple-800',
    'bg-morandi-sage-100',
    'text-morandi-sage-700',
    'bg-morandi-sand-100',
    'text-morandi-sand-700',
    'bg-morandi-blush-100',
    'text-morandi-blush-700',
    'bg-morandi-stone-200',
    'text-morandi-stone-700',
    'bg-orange-200',
    'text-orange-800',
    // Timer button colors (warning and info variants)
    'bg-morandi-peach-100',
    'bg-morandi-peach-200',
    'text-morandi-peach-700',
    'border-morandi-peach-200',
    'hover:bg-morandi-peach-200',
    'focus:ring-morandi-peach-400',
    'bg-morandi-sky-200',
    'bg-morandi-sky-300',
    'text-morandi-sky-700',
    'hover:bg-morandi-sky-300',
    'focus:ring-morandi-sky-400',
  ],
}
