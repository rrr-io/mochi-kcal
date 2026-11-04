import { useEffect, useRef, useState } from "react";

/** Scans an EAN/UPC code with the rear camera. Uses BarcodeDetector when available, otherwise ZXing (iOS Safari). */
export function BarcodeScanner({ onCode }: { onCode: (code: string) => void }) {
  const video = useRef<HTMLVideoElement>(null);
  const [err, setErr] = useState("");

  useEffect(() => {
    let stop = () => {};
    let done = false;
    const hit = (code: string) => {
      if (done) return;
      done = true;
      navigator.vibrate?.(40);
      stop();
      onCode(code);
    };

    (async () => {
      try {
        const BD = (window as any).BarcodeDetector;
        if (BD) {
          const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: "environment" }, audio: false });
          const v = video.current!;
          v.srcObject = stream;
          await v.play();
          const det = new BD({ formats: ["ean_13", "ean_8", "upc_a", "upc_e"] });
          let raf = 0;
          const tick = async () => {
            if (done) return;
            try {
              const codes = await det.detect(v);
              if (codes[0]?.rawValue) return hit(codes[0].rawValue);
            } catch {}
            raf = requestAnimationFrame(tick);
          };
          stop = () => { cancelAnimationFrame(raf); stream.getTracks().forEach((t) => t.stop()); };
          tick();
        } else {
          const { BrowserMultiFormatReader } = await import("@zxing/browser");
          const { BarcodeFormat, DecodeHintType } = await import("@zxing/library");
          const hints = new Map([[DecodeHintType.POSSIBLE_FORMATS, [BarcodeFormat.EAN_13, BarcodeFormat.EAN_8, BarcodeFormat.UPC_A, BarcodeFormat.UPC_E]]]);
          const reader = new BrowserMultiFormatReader(hints as any);
          const controls = await reader.decodeFromConstraints({ video: { facingMode: "environment" } }, video.current!, (res) => {
            if (res) hit(res.getText());
          });
          stop = () => controls.stop();
          if (done) stop();
        }
      } catch {
        setErr("I can't open the camera. Check the permission in settings, or type the code below.");
      }
    })();
    return () => { done = true; stop(); };
  }, [onCode]);

  return (
    <>
      <div className="scanner">
        <video ref={video} playsInline muted />
        <div className="frame" />
      </div>
      {err && <p className="err">{err}</p>}
    </>
  );
}
