import { z } from 'zod';

export const PaletteIdSchema = z.enum(['sand', 'earth', 'marine', 'bloom', 'noir']);
export const CategorySchema = z.enum([
  'outerwear',
  'top',
  'bottom',
  'dress',
  'shoes',
  'bag',
  'accessory',
]);
export const WeatherBandSchema = z.enum(['hot', 'warm', 'cool', 'cold']);
export const WeatherTagSchema = z.enum(['hot', 'warm', 'cool', 'cold', 'rain']);
export const OccasionSchema = z.enum(['office', 'walk', 'party']);
export const GarmentGenderSchema = z.enum(['u', 'w', 'm']);
export const LookModelSchema = z.enum(['w', 'm']);
export const WarmthSchema = z.union([z.literal(0), z.literal(1), z.literal(2), z.literal(3)]);
export const FormalitySchema = z.union([z.literal(0), z.literal(1), z.literal(2), z.literal(3)]);
export const HexColorSchema = z.string().regex(/^#[0-9a-fA-F]{6}$/);

export const PaletteSchema = z.object({
  id: PaletteIdSchema,
  name_uz: z.string().min(1),
  name_en: z.string().min(1),
  tagline_uz: z.string().min(1),
  colors: z.array(HexColorSchema).min(3),
  image: z.string().min(1),
});

export const GarmentSchema = z.object({
  id: z.string().min(1),
  category: CategorySchema,
  name_uz: z.string().min(1),
  name_en: z.string().min(1),
  image: z.string().min(1),
  w: z.number().int().positive(),
  h: z.number().int().positive(),
  color: HexColorSchema,
  color2: HexColorSchema.nullable(),
  palettes: z.array(PaletteIdSchema).min(1),
  weather: z.array(WeatherTagSchema).min(1),
  occasions: z.array(OccasionSchema).min(1),
  warmth: WarmthSchema,
  formality: FormalitySchema,
  gender: GarmentGenderSchema,
});

export const LookSchema = z.object({
  id: z.string().min(1),
  title_uz: z.string().min(1),
  image: z.string().min(1),
  thumb: z.string().min(1),
  w: z.number().int().positive(),
  h: z.number().int().positive(),
  occasion: OccasionSchema,
  weather: WeatherBandSchema,
  palette: PaletteIdSchema,
  model: LookModelSchema,
  items: z.array(z.string().min(1)).min(1),
});

export const HeroSchema = z.object({
  cover: z.string().min(1),
  w: z.number().int().positive(),
  h: z.number().int().positive(),
});

export const ManifestSchema = z.object({
  version: z.literal(1),
  palettes: z.array(PaletteSchema).min(1),
  garments: z.array(GarmentSchema).min(1),
  looks: z.array(LookSchema).min(1),
  hero: HeroSchema,
});

export type PaletteId = z.infer<typeof PaletteIdSchema>;
export type Category = z.infer<typeof CategorySchema>;
export type WeatherBand = z.infer<typeof WeatherBandSchema>;
export type WeatherTag = z.infer<typeof WeatherTagSchema>;
export type Occasion = z.infer<typeof OccasionSchema>;
export type GarmentGender = z.infer<typeof GarmentGenderSchema>;
export type LookModel = z.infer<typeof LookModelSchema>;
export type UserGenderFilter = 'w' | 'm' | 'all';
export type WarmthLevel = z.infer<typeof WarmthSchema>;
export type FormalityLevel = z.infer<typeof FormalitySchema>;
export type Palette = z.infer<typeof PaletteSchema>;
export type Garment = z.infer<typeof GarmentSchema>;
export type Look = z.infer<typeof LookSchema>;
export type Hero = z.infer<typeof HeroSchema>;
export type Manifest = z.infer<typeof ManifestSchema>;
