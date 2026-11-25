export type DesignThemeId =
  | 'editorial-sand'
  | 'noir-luxury'
  | 'midnight-paris'
  | 'emerald-silk'
  | 'terracotta-sun'
  | 'sakura-pearl'
  | 'cyber-studio'
  | 'swiss-gallery'
  | 'espresso-mocha'
  | 'nordic-frost';

export interface DesignThemePreset {
  id: DesignThemeId;
  name_uz: string;
  name_en: string;
  colorScheme: 'light' | 'dark';
  preview: [string, string, string];
  vars: {
    '--paper': string;
    '--paper-2': string;
    '--paper-elevated': string;
    '--ink': string;
    '--ink-2': string;
    '--muted': string;
    '--hairline': string;
    '--hairline-strong': string;
    '--accent': string;
    '--accent-soft': string;
    '--accent-ink': string;
    '--positive': string;
    '--negative': string;
    '--radius': string;
  };
}

export const DESIGN_THEMES: readonly DesignThemePreset[] = [
  {
    id: 'editorial-sand',
    name_uz: 'Atelier Qum',
    name_en: 'Editorial Ivory',
    colorScheme: 'light',
    preview: ['#F5F1E8', '#151412', '#8F1D2C'],
    vars: {
      '--paper': '#F5F1E8',
      '--paper-2': '#EEE8DB',
      '--paper-elevated': '#FAF7F0',
      '--ink': '#151412',
      '--ink-2': '#3B3731',
      '--muted': '#655E53',
      '--hairline': '#D8D0BF',
      '--hairline-strong': '#BDB39E',
      '--accent': '#8F1D2C',
      '--accent-soft': 'rgba(143, 29, 44, 0.09)',
      '--accent-ink': '#FAF7F0',
      '--positive': '#2D5A3C',
      '--negative': '#8F1D2C',
      '--radius': '2px',
    },
  },
  {
    id: 'noir-luxury',
    name_uz: 'Tun Qirmizi',
    name_en: 'Noir Crimson',
    colorScheme: 'dark',
    preview: ['#11100E', '#F3EFE6', '#D94A5B'],
    vars: {
      '--paper': '#11100E',
      '--paper-2': '#191714',
      '--paper-elevated': '#1F1C18',
      '--ink': '#F3EFE6',
      '--ink-2': '#D4CCC0',
      '--muted': '#A29787',
      '--hairline': '#2D2923',
      '--hairline-strong': '#463F35',
      '--accent': '#D94A5B',
      '--accent-soft': 'rgba(217, 74, 91, 0.14)',
      '--accent-ink': '#11100E',
      '--positive': '#65BC85',
      '--negative': '#EB6D7B',
      '--radius': '2px',
    },
  },
  {
    id: 'midnight-paris',
    name_uz: 'Moviy Parij',
    name_en: 'Midnight Indigo',
    colorScheme: 'dark',
    preview: ['#0D1321', '#E8EDF5', '#D4A853'],
    vars: {
      '--paper': '#0D1321',
      '--paper-2': '#151E32',
      '--paper-elevated': '#1B263F',
      '--ink': '#F0F4FA',
      '--ink-2': '#C6D1E6',
      '--muted': '#8E9CB8',
      '--hairline': '#273554',
      '--hairline-strong': '#3D517A',
      '--accent': '#D4A853',
      '--accent-soft': 'rgba(212, 168, 83, 0.16)',
      '--accent-ink': '#0D1321',
      '--positive': '#6CD499',
      '--negative': '#F07178',
      '--radius': '4px',
    },
  },
  {
    id: 'emerald-silk',
    name_uz: 'Zumrad Shoyi',
    name_en: 'Emerald Manor',
    colorScheme: 'light',
    preview: ['#F3F5F0', '#16241C', '#1B5E42'],
    vars: {
      '--paper': '#F3F5F0',
      '--paper-2': '#E6EBE2',
      '--paper-elevated': '#FAFCF8',
      '--ink': '#16241C',
      '--ink-2': '#2F4538',
      '--muted': '#586E61',
      '--hairline': '#CBD6C4',
      '--hairline-strong': '#A7B89E',
      '--accent': '#1B5E42',
      '--accent-soft': 'rgba(27, 94, 66, 0.1)',
      '--accent-ink': '#FAFCF8',
      '--positive': '#1B5E42',
      '--negative': '#A4303F',
      '--radius': '3px',
    },
  },
  {
    id: 'terracotta-sun',
    name_uz: 'Samarqand Terakota',
    name_en: 'Desert Terracotta',
    colorScheme: 'light',
    preview: ['#F7EFE6', '#2D1E16', '#B2573A'],
    vars: {
      '--paper': '#F7EFE6',
      '--paper-2': '#EFE1D1',
      '--paper-elevated': '#FCF7F1',
      '--ink': '#2D1E16',
      '--ink-2': '#523B2F',
      '--muted': '#7D6050',
      '--hairline': '#DFCAB4',
      '--hairline-strong': '#C5A788',
      '--accent': '#B2573A',
      '--accent-soft': 'rgba(178, 87, 58, 0.11)',
      '--accent-ink': '#FCF7F1',
      '--positive': '#3C6A47',
      '--negative': '#A83226',
      '--radius': '4px',
    },
  },
  {
    id: 'sakura-pearl',
    name_uz: 'Bahor Marvaridi',
    name_en: 'Blush Rose',
    colorScheme: 'light',
    preview: ['#FAF2F1', '#2B1F24', '#8B3A56'],
    vars: {
      '--paper': '#FAF2F1',
      '--paper-2': '#F2E4E3',
      '--paper-elevated': '#FFF9F9',
      '--ink': '#2B1F24',
      '--ink-2': '#4D3B42',
      '--muted': '#7B646E',
      '--hairline': '#E3CECE',
      '--hairline-strong': '#CAACAC',
      '--accent': '#8B3A56',
      '--accent-soft': 'rgba(139, 58, 86, 0.1)',
      '--accent-ink': '#FFF9F9',
      '--positive': '#2D684E',
      '--negative': '#9E2A3B',
      '--radius': '6px',
    },
  },
  {
    id: 'cyber-studio',
    name_uz: 'Kiber Studiya',
    name_en: 'Neon Dark 3D',
    colorScheme: 'dark',
    preview: ['#090B10', '#EEF2FF', '#38BDF8'],
    vars: {
      '--paper': '#090B10',
      '--paper-2': '#111520',
      '--paper-elevated': '#161C2C',
      '--ink': '#F1F5FF',
      '--ink-2': '#C7D3ED',
      '--muted': '#8796BA',
      '--hairline': '#242D45',
      '--hairline-strong': '#39486E',
      '--accent': '#38BDF8',
      '--accent-soft': 'rgba(56, 189, 248, 0.15)',
      '--accent-ink': '#090B10',
      '--positive': '#4ADE80',
      '--negative': '#FB7185',
      '--radius': '6px',
    },
  },
  {
    id: 'swiss-gallery',
    name_uz: 'Oq Minimalizm',
    name_en: 'Swiss Pure White',
    colorScheme: 'light',
    preview: ['#FFFFFF', '#0A0A0A', '#000000'],
    vars: {
      '--paper': '#FFFFFF',
      '--paper-2': '#F3F4F6',
      '--paper-elevated': '#FFFFFF',
      '--ink': '#0A0A0A',
      '--ink-2': '#2E3136',
      '--muted': '#646A73',
      '--hairline': '#E2E5E9',
      '--hairline-strong': '#111111',
      '--accent': '#D61F2C',
      '--accent-soft': 'rgba(214, 31, 44, 0.08)',
      '--accent-ink': '#FFFFFF',
      '--positive': '#157347',
      '--negative': '#D61F2C',
      '--radius': '0px',
    },
  },
  {
    id: 'espresso-mocha',
    name_uz: 'Shokolad Espresso',
    name_en: 'Old Money Mocha',
    colorScheme: 'dark',
    preview: ['#1A1410', '#F3E9DD', '#C49A6C'],
    vars: {
      '--paper': '#1A1410',
      '--paper-2': '#241C16',
      '--paper-elevated': '#2C231C',
      '--ink': '#F3E9DD',
      '--ink-2': '#D8C8B4',
      '--muted': '#A6937E',
      '--hairline': '#3A2E25',
      '--hairline-strong': '#59483B',
      '--accent': '#C49A6C',
      '--accent-soft': 'rgba(196, 154, 108, 0.16)',
      '--accent-ink': '#1A1410',
      '--positive': '#74C68E',
      '--negative': '#EA756B',
      '--radius': '3px',
    },
  },
  {
    id: 'nordic-frost',
    name_uz: 'Arktika Muzi',
    name_en: 'Nordic Slate',
    colorScheme: 'light',
    preview: ['#EFF3F8', '#151E2E', '#1E448A'],
    vars: {
      '--paper': '#EFF3F8',
      '--paper-2': '#E3EAF3',
      '--paper-elevated': '#F9FBFE',
      '--ink': '#151E2E',
      '--ink-2': '#313F58',
      '--muted': '#5E6E8A',
      '--hairline': '#CBD5E3',
      '--hairline-strong': '#9DB0CB',
      '--accent': '#1E448A',
      '--accent-soft': 'rgba(30, 68, 138, 0.1)',
      '--accent-ink': '#F9FBFE',
      '--positive': '#236950',
      '--negative': '#B32E42',
      '--radius': '4px',
    },
  },
] as const;

export function getDesignThemeById(id: string): DesignThemePreset {
  return DESIGN_THEMES.find((t) => t.id === id) ?? DESIGN_THEMES[0]!;
}
