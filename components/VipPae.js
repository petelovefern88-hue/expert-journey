// ✅ components/VipPae.js
import { useState, useRef, useEffect } from "react";

export default function VipPae({ onVIP }) {
  const [code, setCode] = useState("");
  const [status, setStatus] = useState("idle"); // idle | error | checking | success
  const [showCode, setShowCode] = useState(false);
  const inputRef = useRef(null);
  const shakeTimeout = useRef(null);

  // ✅ รหัส VIP ที่คุณจะเป็นคนบอกลูกค้า
  const realCode = "P254303";

  useEffect(() => {
    inputRef.current?.focus();
    return () => clearTimeout(shakeTimeout.current);
  }, []);

  const verify = () => {
    if (status === "checking" || status === "success") return;

    if (!code.trim()) {
      triggerError();
      return;
    }

    setStatus("checking");

    // เพิ่มดีเลย์เล็กน้อยให้รู้สึกว่า "กำลังตรวจสอบ" จริงจัง
    setTimeout(() => {
      if (code.trim() === realCode) {
        setStatus("success");
        localStorage.setItem("vip", "yes"); // ✅ ตัวนี้สำคัญสุด!
        setTimeout(() => onVIP(), 650); // ✅ เด้งเข้าหน้าแอปหลังอนิเมชันจบ
      } else {
        triggerError();
      }
    }, 450);
  };

  const triggerError = () => {
    setStatus("error");
    clearTimeout(shakeTimeout.current);
    shakeTimeout.current = setTimeout(() => setStatus("idle"), 900);
  };

  const onKeyDown = (e) => {
    if (e.key === "Enter") verify();
  };

  return (
    <div className="vipx-stage">
      <div
        className={
          "vipx-ticket" +
          (status === "error" ? " vipx-shake" : "") +
          (status === "success" ? " vipx-unlocked" : "")
        }
      >
        {/* ก้านตั๋วด้านซ้าย */}
        <div className="vipx-stub">
          <span className="vipx-stub-text">ADMIT&nbsp;·&nbsp;ONE</span>
          <span className="vipx-stub-dot" />
        </div>

        {/* เส้นปรุรอยตั๋ว */}
        <div className="vipx-perforation" aria-hidden="true" />

        {/* ส่วนหลักของตั๋ว */}
        <div className="vipx-body">
          <div className="vipx-crest">✦</div>
          <h1 className="vipx-title">VIP ACCESS</h1>
          <p className="vipx-subtitle">กรอกรหัสสมาชิกเพื่อเข้าสู่ระบบ</p>

          <div className="vipx-field">
            <input
              ref={inputRef}
              type={showCode ? "text" : "password"}
              placeholder="ENTER CODE"
              value={code}
              onChange={(e) => {
                setCode(e.target.value);
                if (status === "error") setStatus("idle");
              }}
              onKeyDown={onKeyDown}
              disabled={status === "checking" || status === "success"}
              aria-label="VIP code"
              aria-invalid={status === "error"}
              className="vipx-input"
              autoComplete="off"
            />
            <button
              type="button"
              className="vipx-eye"
              onClick={() => setShowCode((s) => !s)}
              aria-label={showCode ? "ซ่อนรหัส" : "แสดงรหัส"}
              tabIndex={-1}
            >
              {showCode ? (
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
                  <path d="M3 3l18 18M10.6 10.6a2 2 0 002.8 2.8M9.3 5.3A10.6 10.6 0 0112 5c5 0 8.5 4 9.9 7-.5 1.1-1.2 2.2-2.1 3.2M6.2 6.6C4.3 8 2.9 9.9 2.1 12c1 2.2 2.6 4 4.6 5.2A10.7 10.7 0 0012 19c1 0 2-.1 2.9-.4" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round"/>
                </svg>
              ) : (
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
                  <path d="M2.1 12S5.6 5 12 5s9.9 7 9.9 7-3.5 7-9.9 7-9.9-7-9.9-7z" stroke="currentColor" strokeWidth="1.6" strokeLinejoin="round"/>
                  <circle cx="12" cy="12" r="3" stroke="currentColor" strokeWidth="1.6"/>
                </svg>
              )}
            </button>
          </div>

          <div className="vipx-message" role="alert">
            {status === "error" && "❌ รหัสไม่ถูกต้อง ลองอีกครั้ง"}
          </div>

          <button
            onClick={verify}
            disabled={status === "checking" || status === "success"}
            className="vipx-confirm"
          >
            {status === "checking" && "กำลังตรวจสอบ…"}
            {status === "success" && "✓ ยืนยันแล้ว"}
            {(status === "idle" || status === "error") && "CONFIRM"}
          </button>
        </div>
      </div>

      <style>{`
        .vipx-stage {
          min-height: 100vh;
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 32px 20px;
          background: radial-gradient(ellipse at 50% -10%, #2a2140 0%, #14101c 55%, #0d0a14 100%);
          font-family: 'Inter', -apple-system, BlinkMacSystemFont, sans-serif;
        }

        .vipx-ticket {
          position: relative;
          display: flex;
          width: 100%;
          max-width: 420px;
          background: linear-gradient(155deg, #201933 0%, #191330 60%, #150f28 100%);
          border-radius: 18px;
          box-shadow:
            0 30px 60px -20px rgba(0,0,0,0.6),
            0 0 0 1px rgba(201,164,76,0.18),
            inset 0 1px 0 rgba(255,255,255,0.04);
          overflow: hidden;
          transition: box-shadow 0.5s ease;
        }

        .vipx-stub {
          width: 56px;
          flex-shrink: 0;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          background: linear-gradient(180deg, #241c3a, #1a1430);
          position: relative;
        }

        .vipx-stub-text {
          writing-mode: vertical-rl;
          text-orientation: mixed;
          font-size: 10px;
          letter-spacing: 3px;
          color: #a9945a;
          font-weight: 600;
        }

        .vipx-stub-dot {
          width: 6px;
          height: 6px;
          border-radius: 50%;
          background: #c9a44c;
          margin-top: 14px;
          box-shadow: 0 0 8px rgba(201,164,76,0.7);
        }

        .vipx-perforation {
          width: 0;
          border-left: 2px dashed rgba(201,164,76,0.35);
          position: relative;
        }
        .vipx-perforation::before,
        .vipx-perforation::after {
          content: "";
          position: absolute;
          left: -7px;
          width: 14px;
          height: 14px;
          border-radius: 50%;
          background: #0d0a14;
        }
        .vipx-perforation::before { top: -7px; }
        .vipx-perforation::after { bottom: -7px; }

        .vipx-body {
          flex: 1;
          padding: 38px 30px 32px;
          display: flex;
          flex-direction: column;
          align-items: center;
          text-align: center;
        }

        .vipx-crest {
          color: #c9a44c;
          font-size: 20px;
          margin-bottom: 10px;
          filter: drop-shadow(0 0 6px rgba(201,164,76,0.5));
        }

        .vipx-title {
          font-family: Georgia, 'Times New Roman', serif;
          font-size: 26px;
          letter-spacing: 4px;
          font-weight: 700;
          color: #f3ecdf;
          margin: 0;
        }

        .vipx-subtitle {
          font-size: 13px;
          color: #8d84a8;
          margin: 8px 0 26px;
        }

        .vipx-field {
          position: relative;
          width: 100%;
        }

        .vipx-input {
          width: 100%;
          box-sizing: border-box;
          background: #100c1e;
          border: 1px solid rgba(201,164,76,0.25);
          color: #f3ecdf;
          font-family: 'JetBrains Mono', ui-monospace, monospace;
          font-size: 17px;
          letter-spacing: 4px;
          text-align: center;
          padding: 15px 42px 15px 16px;
          border-radius: 12px;
          outline: none;
          transition: border-color 0.25s, box-shadow 0.25s;
        }
        .vipx-input::placeholder {
          color: #4d4566;
          letter-spacing: 2px;
        }
        .vipx-input:focus {
          border-color: #c9a44c;
          box-shadow: 0 0 0 3px rgba(201,164,76,0.15);
        }
        .vipx-input:disabled {
          opacity: 0.7;
        }

        .vipx-eye {
          position: absolute;
          right: 10px;
          top: 50%;
          transform: translateY(-50%);
          background: none;
          border: none;
          color: #7a7196;
          cursor: pointer;
          padding: 6px;
          display: flex;
          border-radius: 8px;
        }
        .vipx-eye:hover { color: #c9a44c; }

        .vipx-message {
          min-height: 20px;
          font-size: 13px;
          color: #e0708a;
          margin-top: 12px;
        }

        .vipx-confirm {
          width: 100%;
          margin-top: 6px;
          padding: 14px;
          border: none;
          border-radius: 12px;
          font-weight: 700;
          font-size: 14px;
          letter-spacing: 2px;
          cursor: pointer;
          color: #201933;
          background: linear-gradient(135deg, #e6c976, #c9a44c 55%, #a9843a);
          box-shadow: 0 8px 20px -6px rgba(201,164,76,0.5);
          transition: transform 0.15s ease, box-shadow 0.15s ease, opacity 0.2s;
        }
        .vipx-confirm:hover:not(:disabled) {
          transform: translateY(-1px);
          box-shadow: 0 10px 24px -6px rgba(201,164,76,0.65);
        }
        .vipx-confirm:active:not(:disabled) {
          transform: translateY(0);
        }
        .vipx-confirm:disabled {
          cursor: default;
          opacity: 0.85;
        }

        .vipx-shake { animation: vipx-shake 0.5s; }
        @keyframes vipx-shake {
          10%, 90% { transform: translateX(-1px); }
          20%, 80% { transform: translateX(2px); }
          30%, 50%, 70% { transform: translateX(-5px); }
          40%, 60% { transform: translateX(5px); }
        }

        .vipx-unlocked {
          box-shadow:
            0 30px 60px -20px rgba(0,0,0,0.6),
            0 0 0 1px rgba(201,164,76,0.6),
            0 0 40px rgba(201,164,76,0.35);
        }

        @media (prefers-reduced-motion: reduce) {
          .vipx-shake { animation: none; }
          .vipx-confirm, .vipx-ticket { transition: none; }
        }

        @media (max-width: 400px) {
          .vipx-stub { width: 44px; }
          .vipx-body { padding: 32px 20px 26px; }
        }
      `}</style>
    </div>
  );
}
