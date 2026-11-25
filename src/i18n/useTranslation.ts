import { useMemo } from 'react';
import { getDictionary, latinToCyrillicUz } from './languages';
import { useKapsulaStore } from '../store/useKapsulaStore';

export function useTranslation() {
  const lang = useKapsulaStore((s) => s.language);
  const setLanguage = useKapsulaStore((s) => s.setLanguage);

  const t = useMemo(() => getDictionary(lang), [lang]);

  const localize = (uzText: string) =>
    lang === 'uz_cyrl' ? latinToCyrillicUz(uzText) : uzText;

  return { t, lang, setLanguage, localize };
}
