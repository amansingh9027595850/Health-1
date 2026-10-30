import React, { useState, useEffect, useRef } from "react";
import {
  MessageSquare,
  X,
  Send,
  Mic,
  MicOff,
  Bot,
  User,
  Minimize2,
  Maximize2,
  ChevronDown,
  Trash2,
  Loader,
} from "lucide-react";

interface ChatMessage {
  id: string;
  role: "user" | "assistant" | "system";
  content: string;
  timestamp: Date;
  isTyping?: boolean;
}

const SYSTEM_PROMPT = `You are CausalHealth AI Assistant - a knowledgeable, friendly, and evidence-based clinical health chatbot embedded in a Personal Health Risk and Treatment Benefit Calculator.

Your role is to:
1. Help users understand their health risk scores, biomarkers, and treatment recommendations shown on screen
2. Explain clinical terms in plain language (e.g., what LDL means, what NNT means, what ARR means)
3. Answer questions about cardiovascular health, medications (statins, blood pressure drugs), ICU care, and preventive medicine
4. Provide context for biomarker reference ranges (e.g., normal LDL < 100 mg/dL for high-risk patients)
5. Explain what the causal AI model does and how it works
6. Guide users on what questions to ask their doctor

IMPORTANT RULES:
- Always remind users that this tool is for educational purposes only and not a substitute for professional medical advice
- Be warm, supportive, and easy to understand
- Keep responses concise (2-5 sentences typically) unless a thorough explanation is needed
- If asked about symptoms or emergencies, always advise seeking immediate medical care
- You can explain what ARR, RRR, NNT, and causal inference mean`;

const QUICK_PROMPTS = [
  "What does my risk score mean?",
  "Explain ARR and NNT simply",
  "Is my LDL level dangerous?",
  "Should I take statins?",
  "What questions should I ask my doctor?",
  "How does this AI model work?",
];

export const HealthChatbot: React.FC = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [isExpanded, setIsExpanded] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: "welcome",
      role: "assistant",
      content:
        "Hello! I am CausalHealth AI, your personal health assistant. I can help you understand your risk scores, explain what your biomarkers mean, clarify treatment recommendations, and answer questions about the calculator. What would you like to know?",
      timestamp: new Date(),
    },
  ]);
  const [inputText, setInputText] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);
  const [showScrollDown, setShowScrollDown] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const messagesContainerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const recognitionRef = useRef<any>(null);

  const [activePatient, setActivePatient] = useState<any>(null);

  useEffect(() => {
    const handlePatientLoaded = (e: any) => {
      if (e.detail) {
        setActivePatient(e.detail);
      }
    };

    const handleOpenChatForPatient = (e: any) => {
      setIsOpen(true);
      if (e.detail) {
        const patient = e.detail;
        setActivePatient(patient);
        const arrPct = (Math.abs(patient.causalRiskReductionARR) * 100).toFixed(1);
        const prompt = `Please provide a personalized clinical summary for patient ${patient.userName}: 5-Year Baseline Risk is ${(patient.baselineRiskY0 * 100).toFixed(1)}%, Treated Risk with ${patient.treatmentName} drops to ${(patient.treatedRiskY1 * 100).toFixed(1)}% (Absolute Risk Reduction ARR: ${arrPct}%, NNT: ${patient.numberNeededToTreatNNT}). Blood Pressure: ${patient.inputs.systolicBp} mmHg, LDL: ${patient.inputs.ldlCholesterol} mg/dL, HbA1c: ${patient.inputs.hba1c}%. What are the primary clinical takeaways and recommendations?`;
        sendMessage(prompt);
      }
    };

    window.addEventListener('causalhealth_patient_loaded', handlePatientLoaded);
    window.addEventListener('causalhealth_open_chat', handleOpenChatForPatient);
    return () => {
      window.removeEventListener('causalhealth_patient_loaded', handlePatientLoaded);
      window.removeEventListener('causalhealth_open_chat', handleOpenChatForPatient);
    };
  }, []);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    if (isOpen) {
      scrollToBottom();
      setUnreadCount(0);
    }
  }, [messages, isOpen]);

  const handleScroll = () => {
    const el = messagesContainerRef.current;
    if (!el) return;
    const isAtBottom = el.scrollHeight - el.scrollTop - el.clientHeight < 60;
    setShowScrollDown(!isAtBottom);
  };

  useEffect(() => {
    const SpeechRecognitionAPI =
      (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (SpeechRecognitionAPI) {
      recognitionRef.current = new SpeechRecognitionAPI();
      recognitionRef.current!.continuous = false;
      recognitionRef.current!.interimResults = false;
      recognitionRef.current!.lang = "en-US";
      recognitionRef.current!.onresult = (event: SpeechRecognitionEvent) => {
        const transcript = event.results[0][0].transcript;
        setInputText((prev) => prev + transcript);
        setIsListening(false);
      };
      recognitionRef.current!.onerror = () => setIsListening(false);
      recognitionRef.current!.onend = () => setIsListening(false);
    }
  }, []);

  const toggleVoice = () => {
    if (!recognitionRef.current) return;
    if (isListening) {
      recognitionRef.current.stop();
      setIsListening(false);
    } else {
      recognitionRef.current.start();
      setIsListening(true);
    }
  };

  const sendMessage = async (text: string) => {
    if (!text.trim() || isLoading) return;
    const userText = text.trim();
    setInputText("");

    const userMsg: ChatMessage = {
      id: Date.now().toString(),
      role: "user",
      content: userText,
      timestamp: new Date(),
    };

    setMessages((prev) => [...prev, userMsg]);
    setIsLoading(true);

    const history = messages
      .filter((m) => m.role !== "system" && !m.isTyping)
      .map((m) => ({ role: m.role as "user" | "assistant", content: m.content }));

    try {
      const response = await fetch("http://localhost:3001/api/chat", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          messages: [
            { role: "system", content: SYSTEM_PROMPT },
            ...history,
            { role: "user", content: userText },
          ],
        }),
      });

      if (!response.ok) throw new Error(`API Error ${response.status}`);

      const data = await response.json();
      const assistantContent =
        data?.content ||
        "I apologize, I could not generate a response. Please try again.";

      const assistantMsg: ChatMessage = {
        id: (Date.now() + 1).toString(),
        role: "assistant",
        content: assistantContent,
        timestamp: new Date(),
      };

      setMessages((prev) => [...prev, assistantMsg]);
      if (!isOpen) setUnreadCount((prev) => prev + 1);
    } catch (error) {
      console.error("Chat request failed:", error);
      const errorMsg: ChatMessage = {
        id: (Date.now() + 1).toString(),
        role: "assistant",
        content: "The chat service is unavailable. Please try again later.",
        timestamp: new Date(),
      };
      setMessages((prev) => [...prev, errorMsg]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendMessage(inputText);
    }
  };

  const clearChat = () => {
    setMessages([
      {
        id: "welcome-reset",
        role: "assistant",
        content: "Chat cleared! How can I help you with your health assessment?",
        timestamp: new Date(),
      },
    ]);
  };

  const chatWidth = isExpanded ? "480px" : "360px";
  const chatHeight = isExpanded ? "620px" : "500px";

  return (
    <>
      {isOpen && (
        <div
          style={{
            position: "fixed",
            bottom: "90px",
            right: "24px",
            width: chatWidth,
            height: chatHeight,
            zIndex: 9999,
            display: "flex",
            flexDirection: "column",
            background: "rgba(7, 11, 20, 0.97)",
            backdropFilter: "blur(20px)",
            WebkitBackdropFilter: "blur(20px)",
            border: "1px solid rgba(6, 182, 212, 0.35)",
            borderRadius: "20px",
            boxShadow: "0 20px 60px rgba(0,0,0,0.6), 0 0 40px rgba(6,182,212,0.12)",
            overflow: "hidden",
            animation: "chatSlideUp 0.3s cubic-bezier(0.16, 1, 0.3, 1)",
            transition: "width 0.25s ease, height 0.25s ease",
          }}
        >
          {/* Header */}
          <div
            style={{
              padding: "14px 16px",
              background: "linear-gradient(135deg, rgba(6, 182, 212, 0.2), rgba(2, 132, 199, 0.12))",
              borderBottom: "1px solid rgba(6, 182, 212, 0.2)",
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              flexShrink: 0,
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
              <div
                style={{
                  width: "36px",
                  height: "36px",
                  borderRadius: "50%",
                  background: "linear-gradient(135deg, #06b6d4, #0284c7)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  boxShadow: "0 0 14px rgba(6,182,212,0.45)",
                  flexShrink: 0,
                  position: "relative",
                }}
              >
                <Bot size={18} color="#ffffff" />
                <div
                  style={{
                    position: "absolute",
                    bottom: "1px",
                    right: "1px",
                    width: "9px",
                    height: "9px",
                    borderRadius: "50%",
                    backgroundColor: "#10b981",
                    border: "1.5px solid #070b14",
                  }}
                />
              </div>
              <div>
                <div style={{ fontSize: "13px", fontWeight: "700", color: "#ffffff" }}>
                  CausalHealth AI
                </div>
                <div
                  style={{
                    fontSize: "10px",
                    color: "#34d399",
                    display: "flex",
                    alignItems: "center",
                    gap: "6px",
                  }}
                >
                  <div style={{ display: "flex", alignItems: "center", gap: "4px" }}>
                    <div
                      style={{
                        width: "5px",
                        height: "5px",
                        borderRadius: "50%",
                        backgroundColor: "#10b981",
                      }}
                    />
                    {isLoading ? "Thinking..." : "Online Assistant"}
                  </div>
                  {activePatient && (
                    <span
                      style={{
                        background: "rgba(6, 182, 212, 0.2)",
                        border: "1px solid rgba(6, 182, 212, 0.4)",
                        color: "#22d3ee",
                        padding: "1px 6px",
                        borderRadius: "4px",
                        fontSize: "9px",
                        fontWeight: 600,
                      }}
                      title={`Active Context: ${activePatient.userName} (ARR ${(Math.abs(activePatient.causalRiskReductionARR)*100).toFixed(1)}%)`}
                    >
                      Patient: {activePatient.userName}
                    </span>
                  )}
                </div>
              </div>
            </div>

            <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
              <button
                onClick={clearChat}
                style={{
                  background: "transparent",
                  border: "none",
                  cursor: "pointer",
                  padding: "5px",
                  borderRadius: "6px",
                  color: "#64748b",
                  display: "flex",
                  alignItems: "center",
                }}
                title="Clear chat"
                onMouseEnter={(e) => (e.currentTarget.style.color = "#f87171")}
                onMouseLeave={(e) => (e.currentTarget.style.color = "#64748b")}
              >
                <Trash2 size={14} />
              </button>
              <button
                onClick={() => setIsExpanded((v) => !v)}
                style={{
                  background: "transparent",
                  border: "none",
                  cursor: "pointer",
                  padding: "5px",
                  borderRadius: "6px",
                  color: "#94a3b8",
                  display: "flex",
                  alignItems: "center",
                }}
                title={isExpanded ? "Minimize" : "Expand"}
                onMouseEnter={(e) => (e.currentTarget.style.color = "#22d3ee")}
                onMouseLeave={(e) => (e.currentTarget.style.color = "#94a3b8")}
              >
                {isExpanded ? <Minimize2 size={14} /> : <Maximize2 size={14} />}
              </button>
              <button
                onClick={() => setIsOpen(false)}
                style={{
                  background: "transparent",
                  border: "none",
                  cursor: "pointer",
                  padding: "5px",
                  borderRadius: "6px",
                  color: "#94a3b8",
                  display: "flex",
                  alignItems: "center",
                }}
                title="Close"
                onMouseEnter={(e) => (e.currentTarget.style.color = "#f8fafc")}
                onMouseLeave={(e) => (e.currentTarget.style.color = "#94a3b8")}
              >
                <X size={16} />
              </button>
            </div>
          </div>

          {/* Messages */}
          <div
            ref={messagesContainerRef}
            onScroll={handleScroll}
            style={{
              flex: 1,
              overflowY: "auto",
              padding: "14px 14px 4px",
              display: "flex",
              flexDirection: "column",
              gap: "12px",
              scrollbarWidth: "thin",
              scrollbarColor: "rgba(100,116,139,0.3) transparent",
            }}
          >
            {messages.map((msg) => (
              <div
                key={msg.id}
                style={{
                  display: "flex",
                  alignItems: "flex-end",
                  gap: "8px",
                  flexDirection: msg.role === "user" ? "row-reverse" : "row",
                }}
              >
                <div
                  style={{
                    width: "26px",
                    height: "26px",
                    borderRadius: "50%",
                    background:
                      msg.role === "user"
                        ? "linear-gradient(135deg, #8b5cf6, #6d28d9)"
                        : "linear-gradient(135deg, #06b6d4, #0284c7)",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    flexShrink: 0,
                  }}
                >
                  {msg.role === "user" ? (
                    <User size={13} color="#ffffff" />
                  ) : (
                    <Bot size={13} color="#ffffff" />
                  )}
                </div>
                <div
                  style={{
                    maxWidth: "82%",
                    padding: "10px 13px",
                    borderRadius:
                      msg.role === "user" ? "16px 16px 4px 16px" : "16px 16px 16px 4px",
                    background:
                      msg.role === "user"
                        ? "linear-gradient(135deg, rgba(139, 92, 246, 0.3), rgba(109, 40, 217, 0.25))"
                        : "rgba(16, 26, 48, 0.95)",
                    border:
                      msg.role === "user"
                        ? "1px solid rgba(139, 92, 246, 0.4)"
                        : "1px solid rgba(6, 182, 212, 0.2)",
                    fontSize: "12.5px",
                    color: msg.role === "user" ? "#e2e8f0" : "#cbd5e1",
                    lineHeight: "1.55",
                    wordBreak: "break-word",
                    whiteSpace: "pre-wrap",
                  }}
                >
                  {msg.content}
                </div>
              </div>
            ))}

            {isLoading && (
              <div style={{ display: "flex", alignItems: "flex-end", gap: "8px" }}>
                <div
                  style={{
                    width: "26px",
                    height: "26px",
                    borderRadius: "50%",
                    background: "linear-gradient(135deg, #06b6d4, #0284c7)",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                  }}
                >
                  <Bot size={13} color="#ffffff" />
                </div>
                <div
                  style={{
                    padding: "10px 14px",
                    borderRadius: "16px 16px 16px 4px",
                    background: "rgba(16, 26, 48, 0.95)",
                    border: "1px solid rgba(6, 182, 212, 0.2)",
                    display: "flex",
                    alignItems: "center",
                    gap: "4px",
                  }}
                >
                  {[0, 1, 2].map((i) => (
                    <div
                      key={i}
                      style={{
                        width: "6px",
                        height: "6px",
                        borderRadius: "50%",
                        backgroundColor: "#22d3ee",
                        animation: `typingBounce 1.2s ease-in-out ${i * 0.2}s infinite`,
                      }}
                    />
                  ))}
                </div>
              </div>
            )}

            <div ref={messagesEndRef} />
          </div>

          {showScrollDown && (
            <button
              onClick={scrollToBottom}
              style={{
                position: "absolute",
                bottom: "80px",
                right: "16px",
                width: "28px",
                height: "28px",
                borderRadius: "50%",
                background: "rgba(6, 182, 212, 0.85)",
                border: "none",
                cursor: "pointer",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                zIndex: 10,
              }}
            >
              <ChevronDown size={15} color="#ffffff" />
            </button>
          )}

          {/* Quick Prompts */}
          <div
            style={{
              padding: "6px 14px 0",
              display: "flex",
              gap: "5px",
              overflowX: "auto",
              scrollbarWidth: "none",
              flexShrink: 0,
            }}
          >
            {QUICK_PROMPTS.map((prompt, i) => (
              <button
                key={i}
                onClick={() => sendMessage(prompt)}
                disabled={isLoading}
                style={{
                  background: "rgba(6, 182, 212, 0.08)",
                  border: "1px solid rgba(6, 182, 212, 0.2)",
                  borderRadius: "20px",
                  padding: "4px 10px",
                  fontSize: "10px",
                  color: "#94a3b8",
                  cursor: isLoading ? "not-allowed" : "pointer",
                  whiteSpace: "nowrap",
                  fontFamily: "inherit",
                  transition: "all 0.2s",
                  flexShrink: 0,
                }}
                onMouseEnter={(e) => {
                  if (!isLoading) {
                    e.currentTarget.style.background = "rgba(6, 182, 212, 0.18)";
                    e.currentTarget.style.color = "#22d3ee";
                    e.currentTarget.style.borderColor = "rgba(6, 182, 212, 0.45)";
                  }
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.background = "rgba(6, 182, 212, 0.08)";
                  e.currentTarget.style.color = "#94a3b8";
                  e.currentTarget.style.borderColor = "rgba(6, 182, 212, 0.2)";
                }}
              >
                {prompt}
              </button>
            ))}
          </div>

          {/* Input Bar */}
          <div
            style={{
              padding: "10px 14px 14px",
              borderTop: "1px solid rgba(6, 182, 212, 0.1)",
              display: "flex",
              gap: "8px",
              alignItems: "center",
              marginTop: "6px",
              flexShrink: 0,
            }}
          >
            <button
              onClick={toggleVoice}
              title={isListening ? "Stop listening" : "Start voice input"}
              style={{
                width: "36px",
                height: "36px",
                borderRadius: "50%",
                background: isListening
                  ? "rgba(239, 68, 68, 0.25)"
                  : "rgba(30, 41, 59, 0.7)",
                border: isListening
                  ? "1px solid rgba(239, 68, 68, 0.5)"
                  : "1px solid rgba(148, 163, 184, 0.25)",
                cursor: "pointer",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                flexShrink: 0,
                transition: "all 0.2s",
              }}
            >
              {isListening ? (
                <MicOff size={14} color="#f87171" />
              ) : (
                <Mic size={14} color="#94a3b8" />
              )}
            </button>

            <input
              ref={inputRef}
              type="text"
              value={inputText}
              onChange={(e) => setInputText(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder={isListening ? "Listening..." : "Ask about your health results..."}
              disabled={isLoading}
              style={{
                flex: 1,
                background: "rgba(10, 17, 32, 0.9)",
                border: "1px solid rgba(148, 163, 184, 0.2)",
                borderRadius: "20px",
                padding: "9px 14px",
                fontSize: "12.5px",
                color: "#f8fafc",
                outline: "none",
                fontFamily: "inherit",
                transition: "border-color 0.2s",
              }}
              onFocus={(e) => (e.target.style.borderColor = "rgba(6, 182, 212, 0.5)")}
              onBlur={(e) => (e.target.style.borderColor = "rgba(148, 163, 184, 0.2)")}
            />

            <button
              onClick={() => sendMessage(inputText)}
              disabled={!inputText.trim() || isLoading}
              style={{
                width: "36px",
                height: "36px",
                borderRadius: "50%",
                background:
                  !inputText.trim() || isLoading
                    ? "rgba(30, 41, 59, 0.4)"
                    : "linear-gradient(135deg, #06b6d4, #0284c7)",
                border: "none",
                cursor: !inputText.trim() || isLoading ? "not-allowed" : "pointer",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                flexShrink: 0,
                boxShadow:
                  !inputText.trim() || isLoading
                    ? "none"
                    : "0 4px 14px rgba(6,182,212,0.4)",
                transition: "all 0.2s",
              }}
            >
              {isLoading ? (
                <Loader
                  size={14}
                  color="#64748b"
                  style={{ animation: "spin 1s linear infinite" }}
                />
              ) : (
                <Send size={14} color={!inputText.trim() ? "#64748b" : "#ffffff"} />
              )}
            </button>
          </div>
        </div>
      )}

      {/* FAB Launch Button */}
      <button
        onClick={() => {
          setIsOpen((v) => !v);
          setUnreadCount(0);
        }}
        style={{
          position: "fixed",
          bottom: "24px",
          right: "24px",
          width: "58px",
          height: "58px",
          borderRadius: "50%",
          background: isOpen
            ? "rgba(30, 41, 59, 0.9)"
            : "linear-gradient(135deg, #06b6d4, #0284c7)",
          border: isOpen ? "1px solid rgba(148,163,184,0.3)" : "none",
          cursor: "pointer",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          zIndex: 10000,
          boxShadow: isOpen
            ? "0 4px 20px rgba(0,0,0,0.4)"
            : "0 6px 28px rgba(6,182,212,0.55), 0 0 40px rgba(6,182,212,0.2)",
          transition: "all 0.3s cubic-bezier(0.16, 1, 0.3, 1)",
        }}
        title={isOpen ? "Close AI Health Assistant" : "Open AI Health Assistant"}
        onMouseEnter={(e) => {
          if (!isOpen) e.currentTarget.style.transform = "scale(1.08)";
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.transform = "scale(1)";
        }}
      >
        {isOpen ? (
          <X size={22} color="#94a3b8" />
        ) : (
          <MessageSquare size={22} color="#ffffff" />
        )}

        {!isOpen && unreadCount > 0 && (
          <div
            style={{
              position: "absolute",
              top: "-2px",
              right: "-2px",
              width: "20px",
              height: "20px",
              borderRadius: "50%",
              background: "#ef4444",
              border: "2px solid #070b14",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: "10px",
              fontWeight: "bold",
              color: "#ffffff",
            }}
          >
            {unreadCount}
          </div>
        )}

        {!isOpen && (
          <div
            style={{
              position: "absolute",
              inset: "-4px",
              borderRadius: "50%",
              border: "2px solid rgba(6,182,212,0.4)",
              animation: "chatPulse 2s ease-out infinite",
              pointerEvents: "none",
            }}
          />
        )}
      </button>

      <style>{`
        @keyframes chatSlideUp {
          from { opacity: 0; transform: translateY(20px) scale(0.97); }
          to   { opacity: 1; transform: translateY(0) scale(1); }
        }
        @keyframes chatPulse {
          0%   { transform: scale(1); opacity: 0.7; }
          70%  { transform: scale(1.35); opacity: 0; }
          100% { transform: scale(1.35); opacity: 0; }
        }
        @keyframes typingBounce {
          0%, 60%, 100% { transform: translateY(0); }
          30% { transform: translateY(-5px); }
        }
        @keyframes spin { to { transform: rotate(360deg); } }
      `}</style>
    </>
  );
};
