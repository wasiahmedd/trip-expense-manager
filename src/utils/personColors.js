const PERSON_THEME_PALETTE = [
  { rich: '#F0311F', light: '#F57A6F', text: '#FFFFFF', lightText: '#2E0A06' }, // rich red
  { rich: '#1F5FF0', light: '#7298F8', text: '#FFFFFF', lightText: '#081634' }, // rich blue
  { rich: '#17A34A', light: '#74CD95', text: '#FFFFFF', lightText: '#072212' }, // rich green
  { rich: '#E57A1C', light: '#F2AF70', text: '#FFFFFF', lightText: '#2F1604' }, // rich orange
  { rich: '#7A2EF0', light: '#AE82F7', text: '#FFFFFF', lightText: '#1A0935' }, // rich violet
  { rich: '#D92D86', light: '#EB7EB7', text: '#FFFFFF', lightText: '#31091E' }, // rich pink
  { rich: '#0FA3A3', light: '#73D1D1', text: '#FFFFFF', lightText: '#062424' }, // rich teal
  { rich: '#4A4A4A', light: '#8A8A8A', text: '#FFFFFF', lightText: '#101010' } // rich gray
];

export const getPersonTheme = (index = 0) => {
  const base = PERSON_THEME_PALETTE[index % PERSON_THEME_PALETTE.length];
  return {
    ...base,
    // backward-compatible aliases used in other components
    bg: base.rich,
    mutedBg: base.light,
    accent: base.rich,
    mutedBorder: base.light,
    mutedText: base.lightText
  };
};
