import { useEffect, useRef, useState } from 'react';
import { GarmentImage } from '../components/GarmentImage';
import { CATEGORY_ORDER, type Category, type Garment } from '../data/schema';
import { useTranslation } from '../i18n/useTranslation';
import { useKapsulaStore } from '../store/useKapsulaStore';
import { analyzeGarmentPhoto, type PhotoAnalysisResult } from '../utils/photo-analyzer';

export function PhotoAnalyzerSection() {
  const { t, localize } = useTranslation();
  const manifest = useKapsulaStore((s) => s.manifest);
  const query = useKapsulaStore((s) => s.query);
  const addCustomGarment = useKapsulaStore((s) => s.addCustomGarment);
  const loadItemsToBoard = useKapsulaStore((s) => s.loadItemsToBoard);
  const placeGarmentOnBoard = useKapsulaStore((s) => s.placeGarmentOnBoard);
  const setActiveView = useKapsulaStore((s) => s.setActiveView);

  const [selectedCategory, setSelectedCategory] = useState<Category>('top');
  const [customName, setCustomName] = useState('');
  const [lastFile, setLastFile] = useState<File | HTMLCanvasElement | null>(null);
  const [analyzing, setAnalyzing] = useState(false);
  const [analysis, setAnalysis] = useState<PhotoAnalysisResult | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [savedFlag, setSavedFlag] = useState(false);

  // Live camera modal state
  const [cameraActive, setCameraActive] = useState(false);
  const [cameraFacing, setCameraFacing] = useState<'environment' | 'user'>('environment');
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);

  const stopCameraStream = () => {
    if (streamRef.current) {
      for (const track of streamRef.current.getTracks()) {
        track.stop();
      }
      streamRef.current = null;
    }
    setCameraActive(false);
  };

  useEffect(() => {
    return () => {
      if (streamRef.current) {
        for (const track of streamRef.current.getTracks()) track.stop();
      }
    };
  }, []);

  const runAnalysis = async (
    source: File | HTMLCanvasElement,
    categoryOverride?: Category,
    nameOverride?: string,
  ) => {
    setAnalyzing(true);
    setErrorMsg(null);
    setSavedFlag(false);
    setLastFile(source);
    try {
      const result = await analyzeGarmentPhoto(source, {
        category: categoryOverride ?? selectedCategory,
        customName: nameOverride ?? customName,
        manifest,
        query,
      });
      setAnalysis(result);
    } catch {
      setErrorMsg('Rasmni tahlil qilib boʻlmadi — iltimos boshqa rasm tanlang.');
    } finally {
      setAnalyzing(false);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    void runAnalysis(file);
    e.target.value = '';
  };

  const startLiveCamera = async (facing: 'environment' | 'user' = cameraFacing) => {
    setErrorMsg(null);
    if (!navigator.mediaDevices?.getUserMedia) {
      setErrorMsg('Brauzer jonli kamerani qoʻllab-quvvatlamaydi — galereyadan rasm yuklang.');
      return;
    }
    stopCameraStream();
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: facing, width: { ideal: 960 }, height: { ideal: 1280 } },
        audio: false,
      });
      streamRef.current = stream;
      setCameraFacing(facing);
      setCameraActive(true);
      requestAnimationFrame(() => {
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          void videoRef.current.play();
        }
      });
    } catch {
      setErrorMsg('Kamera ruxsati berilmadi yoki qurilmada kamera topilmadi.');
    }
  };

  const captureFromCamera = () => {
    const video = videoRef.current;
    if (!video || !video.videoWidth || !video.videoHeight) return;
    const canvas = document.createElement('canvas');
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
    stopCameraStream();
    void runAnalysis(canvas);
  };

  // Built-in quick sample canvas for instant demonstration without needing a camera/file
  const testWithSampleGarment = (presetName: string, hex: string, accent: string, cat: Category) => {
    const canvas = document.createElement('canvas');
    canvas.width = 240;
    canvas.height = 300;
    const ctx = canvas.getContext('2d');
    if (ctx) {
      ctx.fillStyle = '#F5F1E8';
      ctx.fillRect(0, 0, 240, 300);
      ctx.fillStyle = hex;
      ctx.fillRect(42, 48, 156, 198);
      ctx.fillStyle = accent;
      ctx.fillRect(92, 54, 56, 22);
    }
    setSelectedCategory(cat);
    setCustomName(presetName);
    void runAnalysis(canvas, cat, presetName);
  };

  const handleSaveToWardrobe = () => {
    if (!analysis) return;
    addCustomGarment(analysis.virtualGarment);
    setSavedFlag(true);
  };

  const handleOpenInAtelier = () => {
    if (!analysis) return;
    addCustomGarment(analysis.virtualGarment);
    const catalogPartnerIds = analysis.recommendedBoardGarments
      .filter((g) => !g.isUserUploaded)
      .map((g) => g.id);
    loadItemsToBoard(catalogPartnerIds);
    placeGarmentOnBoard(analysis.virtualGarment);
    setActiveView('atelye');
  };

  const pairingEntries = analysis
    ? (Object.entries(analysis.pairingByCategory) as Array<[Category, Garment[]]>)
    : [];

  return (
    <section
      id="skaner"
      className="min-h-[calc(100dvh-7rem)] py-10 sm:py-16 border-b border-[var(--hairline)]"
    >
      <div className="mx-auto max-w-[1360px] px-4 sm:px-8">
        <div className="flex flex-wrap items-baseline justify-between gap-4 pb-6 border-b border-[var(--hairline)]">
          <div>
            <p className="text-[11px] uppercase tracking-[0.2em] text-[var(--muted)] mb-2">
              {t.sections.skaner}
            </p>
            <h2 className="font-editorial text-3xl sm:text-5xl tracking-[-0.02em]">
              {t.photoAnalyzer.heading}
            </h2>
            <p className="mt-2 max-w-2xl text-sm text-[var(--muted)]">
              {t.photoAnalyzer.subheading}
            </p>
          </div>
        </div>

        {/* Honest Transparency Banner */}
        <div className="mt-5 border border-[var(--hairline-strong)] bg-[var(--paper-2)]/70 px-4 py-3 text-xs text-[var(--ink-2)] flex items-start gap-2.5">
          <span className="h-2 w-2 mt-1.5 rounded-full bg-[var(--positive)] shrink-0" aria-hidden="true" />
          <p>{t.photoAnalyzer.privacyNote}</p>
        </div>

        <div className="mt-8 grid gap-8 lg:grid-cols-12 items-start">
          {/* LEFT: Capture & Inputs */}
          <div className="lg:col-span-5 border border-[var(--hairline)] bg-[var(--paper-elevated)] p-5 sm:p-6 space-y-5">
            <div>
              <label className="block text-xs uppercase tracking-[0.14em] text-[var(--ink)] font-medium mb-2.5">
                {t.photoAnalyzer.itemTypeLabel}
              </label>
              <div className="flex flex-wrap gap-2">
                {CATEGORY_ORDER.map((cat) => {
                  const active = selectedCategory === cat;
                  return (
                    <button
                      key={cat}
                      type="button"
                      onClick={() => {
                        setSelectedCategory(cat);
                        if (lastFile) void runAnalysis(lastFile, cat, customName);
                      }}
                      className={`min-h-[38px] px-3 py-1.5 text-xs border transition-colors cursor-pointer ${
                        active
                          ? 'border-[var(--ink)] bg-[var(--ink)] text-[var(--paper)] font-medium'
                          : 'border-[var(--hairline)] bg-[var(--paper)] text-[var(--ink-2)] hover:border-[var(--ink)]'
                      }`}
                    >
                      {t.categories[cat]}
                    </button>
                  );
                })}
              </div>
            </div>

            <div>
              <label
                htmlFor="custom-garment-name"
                className="block text-xs uppercase tracking-[0.14em] text-[var(--ink)] font-medium mb-2"
              >
                {t.photoAnalyzer.customNameLabel}
              </label>
              <input
                id="custom-garment-name"
                type="text"
                value={customName}
                onChange={(e) => setCustomName(e.target.value)}
                placeholder={t.photoAnalyzer.customNamePlaceholder}
                className="w-full min-h-[44px] border border-[var(--hairline)] bg-[var(--paper)] px-3.5 text-sm text-[var(--ink)] placeholder:text-[var(--muted)] focus:border-[var(--accent)] focus:outline-none"
              />
            </div>

            {/* Action Buttons: Gallery, Native Camera, WebRTC Live Camera */}
            <div className="space-y-2.5">
              <label className="min-h-[46px] w-full flex items-center justify-center gap-2 bg-[var(--ink)] text-[var(--paper)] px-4 py-3 text-xs uppercase tracking-[0.14em] font-medium hover:bg-[var(--accent)] transition-colors cursor-pointer">
                <span>{t.photoAnalyzer.uploadBtn}</span>
                <input
                  type="file"
                  accept="image/*"
                  onChange={handleFileChange}
                  className="sr-only"
                />
              </label>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                <label className="min-h-[44px] flex items-center justify-center border border-[var(--hairline-strong)] bg-[var(--paper)] px-3 py-2.5 text-xs uppercase tracking-[0.1em] text-[var(--ink)] hover:border-[var(--ink)] transition-colors cursor-pointer text-center">
                  <span>{t.photoAnalyzer.cameraBtn}</span>
                  <input
                    type="file"
                    accept="image/*"
                    capture="environment"
                    onChange={handleFileChange}
                    className="sr-only"
                  />
                </label>

                <button
                  type="button"
                  onClick={() => (cameraActive ? stopCameraStream() : void startLiveCamera('environment'))}
                  className="min-h-[44px] flex items-center justify-center border border-[var(--hairline-strong)] bg-[var(--paper)] px-3 py-2.5 text-xs uppercase tracking-[0.1em] text-[var(--ink)] hover:border-[var(--accent)] hover:text-[var(--accent)] transition-colors cursor-pointer"
                >
                  {cameraActive ? t.photoAnalyzer.stopCamera : t.photoAnalyzer.selfieBtn}
                </button>
              </div>
            </div>

            {/* Live Camera Feed */}
            {cameraActive && (
              <div className="border border-[var(--ink)] bg-[#11100E] p-2 space-y-2">
                <video
                  ref={videoRef}
                  playsInline
                  muted
                  className="w-full max-h-[300px] object-cover rounded-sm"
                />
                <div className="flex flex-wrap items-center gap-2">
                  <button
                    type="button"
                    onClick={captureFromCamera}
                    className="flex-1 min-h-[42px] bg-[var(--accent)] text-[var(--accent-ink)] text-xs uppercase tracking-[0.14em] font-medium cursor-pointer"
                  >
                    {t.photoAnalyzer.capturePhoto}
                  </button>
                  <button
                    type="button"
                    onClick={() =>
                      void startLiveCamera(cameraFacing === 'environment' ? 'user' : 'environment')
                    }
                    className="min-h-[42px] px-3 border border-[var(--hairline)] bg-[var(--paper)] text-[var(--ink)] text-xs cursor-pointer"
                  >
                    {localize('Old / Orqa kamera')}
                  </button>
                </div>
              </div>
            )}

            {/* Quick Presets so anyone can test immediately without hunting for photos */}
            <div className="pt-3 border-t border-[var(--hairline)]">
              <p className="text-[11px] uppercase tracking-[0.12em] text-[var(--muted)] mb-2">
                {localize('Tez sinov (namunaviy matolar)')}
              </p>
              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={() => testWithSampleGarment('Kulrang oversize hudi', '#4A4E57', '#D8D2C5', 'top')}
                  className="px-2.5 py-1.5 text-[11px] border border-[var(--hairline)] bg-[var(--paper)] hover:border-[var(--ink)] cursor-pointer flex items-center gap-1.5"
                >
                  <span className="h-2.5 w-2.5 rounded-full bg-[#4A4E57]" />
                  <span>{localize('Kulrang hudi')}</span>
                </button>
                <button
                  type="button"
                  onClick={() => testWithSampleGarment('Zaytun kargo shim', '#5F6642', '#2E2B25', 'bottom')}
                  className="px-2.5 py-1.5 text-[11px] border border-[var(--hairline)] bg-[var(--paper)] hover:border-[var(--ink)] cursor-pointer flex items-center gap-1.5"
                >
                  <span className="h-2.5 w-2.5 rounded-full bg-[#5F6642]" />
                  <span>{localize('Zaytun kargo')}</span>
                </button>
                <button
                  type="button"
                  onClick={() => testWithSampleGarment('Tuyarang palto', '#B98E5E', '#3E3228', 'outerwear')}
                  className="px-2.5 py-1.5 text-[11px] border border-[var(--hairline)] bg-[var(--paper)] hover:border-[var(--ink)] cursor-pointer flex items-center gap-1.5"
                >
                  <span className="h-2.5 w-2.5 rounded-full bg-[#B98E5E]" />
                  <span>{localize('Tuyarang palto')}</span>
                </button>
              </div>
            </div>

            {errorMsg && (
              <p role="alert" className="text-xs text-[var(--negative)] border border-[var(--negative)]/40 bg-[var(--paper-2)] p-3">
                {localize(errorMsg)}
              </p>
            )}
          </div>

          {/* RIGHT: Analysis Output & Pairings */}
          <div className="lg:col-span-7">
            {analyzing && (
              <div className="border border-[var(--hairline)] bg-[var(--paper-elevated)] p-10 text-center text-sm text-[var(--muted)]">
                {localize('Rang va kontrast OKLCH fazosida tahlil qilinmoqda...')}
              </div>
            )}

            {!analyzing && !analysis && (
              <div className="border border-dashed border-[var(--hairline-strong)] bg-[var(--paper-elevated)] p-10 sm:p-14 text-center space-y-3">
                <p className="font-editorial italic text-2xl text-[var(--ink)]">
                  {t.nav.skaner}
                </p>
                <p className="max-w-md mx-auto text-sm text-[var(--muted)]">
                  {t.photoAnalyzer.emptyState}
                </p>
              </div>
            )}

            {!analyzing && analysis && (
              <div className="space-y-6">
                {/* Preview + Extracted Swatches */}
                <div className="border border-[var(--hairline)] bg-[var(--paper-elevated)] p-5 flex flex-col sm:flex-row gap-5">
                  <img
                    src={analysis.thumbnailDataUrl}
                    alt={localize(analysis.virtualGarment.name_uz)}
                    className="w-full sm:w-36 h-48 object-cover border border-[var(--hairline)] shrink-0"
                  />
                  <div className="flex-1 min-w-0 space-y-4">
                    <div className="flex flex-wrap items-start justify-between gap-2">
                      <div>
                        <p className="text-[11px] uppercase tracking-[0.14em] text-[var(--muted)]">
                          {t.categories[analysis.virtualGarment.category]} ·{' '}
                          {localize(analysis.closestPalette?.name_uz ?? 'Neytral')}
                        </p>
                        <h3 className="font-editorial text-2xl text-[var(--ink)]">
                          {localize(analysis.virtualGarment.name_uz)}
                        </h3>
                      </div>
                    </div>

                    <div>
                      <p className="text-[11px] uppercase tracking-[0.14em] text-[var(--muted)] mb-2">
                        {t.photoAnalyzer.dominantColorsTitle}
                      </p>
                      <div className="flex flex-wrap gap-2">
                        {analysis.swatches.map((sw) => (
                          <div
                            key={sw.hex}
                            className="inline-flex items-center gap-2 border border-[var(--hairline)] bg-[var(--paper)] px-2.5 py-1.5 text-xs"
                          >
                            <span
                              className="h-4 w-4 rounded-full border border-[var(--ink)]/20 shrink-0"
                              style={{ backgroundColor: sw.hex }}
                            />
                            <span className="font-tabular font-medium text-[var(--ink)]">{sw.hex}</span>
                            <span className="text-[var(--muted)] font-tabular">
                              {Math.round(sw.share * 100)}%
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>

                    <div className="flex flex-wrap gap-2.5 pt-1">
                      <button
                        type="button"
                        onClick={handleSaveToWardrobe}
                        disabled={savedFlag}
                        className="min-h-[42px] px-4 py-2 border border-[var(--ink)] bg-[var(--paper)] text-xs uppercase tracking-[0.12em] font-medium text-[var(--ink)] hover:bg-[var(--paper-2)] disabled:opacity-60 cursor-pointer"
                      >
                        {savedFlag ? t.photoAnalyzer.savedToWardrobe : t.photoAnalyzer.saveToWardrobe}
                      </button>
                      <button
                        type="button"
                        onClick={handleOpenInAtelier}
                        className="min-h-[42px] px-4 py-2 bg-[var(--accent)] text-[var(--accent-ink)] text-xs uppercase tracking-[0.12em] font-medium hover:opacity-90 cursor-pointer"
                      >
                        {t.photoAnalyzer.addAndOpenAtelier}
                      </button>
                    </div>
                  </div>
                </div>

                {/* Stylist & Accessory Advice Box */}
                <div className="border-2 border-[var(--accent)] bg-[var(--accent-soft)]/50 p-5 space-y-2">
                  <p className="text-[11px] uppercase tracking-[0.16em] text-[var(--accent)] font-semibold">
                    {t.photoAnalyzer.adviceTitle}
                  </p>
                  <p className="text-sm sm:text-base text-[var(--ink)] leading-relaxed font-medium">
                    {localize(analysis.summaryUz)}
                  </p>
                  {analysis.smartAdvice && (
                    <p className="text-sm text-[var(--ink-2)] leading-relaxed border-t border-[var(--hairline)] pt-2 mt-2">
                      {localize(analysis.smartAdvice.summaryUz)}
                    </p>
                  )}
                </div>

                {/* Suggested Matching Garments */}
                <div>
                  <h4 className="text-xs uppercase tracking-[0.16em] text-[var(--muted)] mb-3">
                    {t.photoAnalyzer.pairsTitle}
                  </h4>
                  <div className="space-y-4">
                    {pairingEntries.slice(0, 4).map(([cat, items]) => (
                      <div key={cat} className="border border-[var(--hairline)] bg-[var(--paper-elevated)] p-4">
                        <p className="text-[11px] uppercase tracking-[0.14em] text-[var(--muted)] mb-3">
                          {t.categories[cat]}
                        </p>
                        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                          {items.map((cand) => (
                            <button
                              key={cand.id}
                              type="button"
                              onClick={() => {
                                addCustomGarment(analysis.virtualGarment);
                                loadItemsToBoard([analysis.virtualGarment.id, cand.id]);
                                setActiveView('atelye');
                              }}
                              className="border border-[var(--hairline)] bg-[var(--paper)] p-2.5 text-left hover:border-[var(--ink)] transition-colors cursor-pointer flex flex-col justify-between"
                            >
                              <div className="h-24 w-full flex items-center justify-center">
                                <GarmentImage garment={cand} className="h-full w-full" />
                              </div>
                              <div className="mt-2 pt-2 border-t border-[var(--hairline)]">
                                {cand.brand && (
                                  <span className="block text-[9px] uppercase tracking-[0.1em] text-[var(--muted)]">
                                    {cand.brand}
                                  </span>
                                )}
                                <span className="block text-xs text-[var(--ink)] line-clamp-2">
                                  {localize(cand.name_uz)}
                                </span>
                              </div>
                            </button>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </section>
  );
}
