"use client";

import React, { useState, useEffect } from "react";
import {
  createQuestion,
  listQuestions,
  deleteQuestion,
  updateQuestion,
  extractQuestionsFromPdf,
  extractQuestionsFromFile,
  extractQuestionsFromUrl,
  batchCreateQuestions,
  ExtractedQuestionsResult
} from "@/lib/api";

export default function QuestionBankManager() {
  const [questions, setQuestions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  // Search & Filter state
  const [searchTerm, setSearchTerm] = useState("");
  const [typeFilter, setTypeFilter] = useState<string>("ALL");
  const [difficultyFilter, setDifficultyFilter] = useState<string>("ALL");

  // Create state
  const [questionText, setQuestionText] = useState("");
  const [questionType, setQuestionType] = useState("MCQ");
  const [subject, setSubject] = useState("Computer Science");
  const [difficulty, setDifficulty] = useState("MEDIUM");
  const [marks, setMarks] = useState(2.0);
  const [negativeMarks, setNegativeMarks] = useState(0.5);
  const [modelAnswer, setModelAnswer] = useState("");

  // Edit state & modal
  const [editingQuestion, setEditingQuestion] = useState<any | null>(null);
  const [editPrompt, setEditPrompt] = useState("");
  const [editType, setEditType] = useState("MCQ");
  const [editSubject, setEditSubject] = useState("");
  const [editDifficulty, setEditDifficulty] = useState("MEDIUM");
  const [editMarks, setEditMarks] = useState(2.0);
  const [editNegativeMarks, setEditNegativeMarks] = useState(0.5);
  const [editModelAnswer, setEditModelAnswer] = useState("");
  const [editOptions, setEditOptions] = useState<any[]>([]);

  // Multi-Source AI Question Extractor & Generator State
  const [isExtractModalOpen, setIsExtractModalOpen] = useState(false);
  const [extractSourceTab, setExtractSourceTab] = useState<"file" | "url">("file");
  const [uploadFile, setUploadFile] = useState<File | null>(null);
  const [webUrl, setWebUrl] = useState("");
  const [importSubject, setImportSubject] = useState("Computer Science");
  const [easyCount, setEasyCount] = useState(2);
  const [mediumCount, setMediumCount] = useState(5);
  const [hardCount, setHardCount] = useState(3);
  const [allowedTypes, setAllowedTypes] = useState<string[]>(["MCQ", "SHORT_ANSWER", "LONG_ANSWER"]);
  const [isExtracting, setIsExtracting] = useState(false);
  const [extractError, setExtractError] = useState("");
  const [extractedQuestions, setExtractedQuestions] = useState<any[]>([]);
  const [extractionResult, setExtractionResult] = useState<ExtractedQuestionsResult | null>(null);
  const [isSavingBatch, setIsSavingBatch] = useState(false);

  const [opt1, setOpt1] = useState("");
  const [opt2, setOpt2] = useState("");
  const [opt3, setOpt3] = useState("");
  const [opt4, setOpt4] = useState("");
  const [correctOptIndex, setCorrectOptIndex] = useState(0);

  useEffect(() => {
    loadQuestions();
  }, []);

  const loadQuestions = async () => {
    setLoading(true);
    try {
      const data = await listQuestions();
      setQuestions(data);
    } catch (err: any) {
      setError("Failed to load question bank.");
    } finally {
      setLoading(false);
    }
  };

  const handleCreateQuestion = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setSuccess("");

    if (!questionText.trim()) {
      setError("Question prompt is required.");
      return;
    }

    let optionsPayload: any[] = [];
    if (questionType === "MCQ") {
      const optTexts = [opt1, opt2, opt3, opt4].filter((t) => t.trim() !== "");
      if (optTexts.length < 2) {
        setError("Please provide at least 2 options for an MCQ.");
        return;
      }
      optionsPayload = [
        { option_text: opt1, is_correct: correctOptIndex === 0 },
        { option_text: opt2, is_correct: correctOptIndex === 1 },
        opt3 ? { option_text: opt3, is_correct: correctOptIndex === 2 } : null,
        opt4 ? { option_text: opt4, is_correct: correctOptIndex === 3 } : null,
      ].filter(Boolean);
    }

    try {
      await createQuestion({
        question_text: questionText,
        question_type: questionType,
        subject,
        difficulty,
        marks: Number(marks),
        negative_marks: Number(negativeMarks),
        model_answer: modelAnswer,
        options: optionsPayload,
      });

      setSuccess("Question added to Question Bank!");
      setQuestionText("");
      setModelAnswer("");
      setOpt1("");
      setOpt2("");
      setOpt3("");
      setOpt4("");
      loadQuestions();
    } catch (err: any) {
      setError(err.message || "Failed to create question.");
    }
  };

  const handleStartEdit = (q: any) => {
    setEditingQuestion(q);
    setEditPrompt(q.question_text || "");
    setEditType(q.question_type || "MCQ");
    setEditSubject(q.subject || "");
    setEditDifficulty(q.difficulty || "MEDIUM");
    setEditMarks(q.marks || 2.0);
    setEditNegativeMarks(q.negative_marks || 0.0);
    setEditModelAnswer(q.model_answer || "");
    if (q.options && q.options.length > 0) {
      setEditOptions(q.options.map((o: any) => ({ ...o })));
    } else {
      setEditOptions([
        { option_text: "", is_correct: true },
        { option_text: "", is_correct: false },
        { option_text: "", is_correct: false },
        { option_text: "", is_correct: false },
      ]);
    }
  };

  const handleSaveEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingQuestion) return;
    setError("");
    setSuccess("");

    try {
      let finalOptions: any[] = [];
      if (editType === "MCQ") {
        finalOptions = editOptions.filter((o) => o.option_text && o.option_text.trim() !== "");
        if (finalOptions.length < 2) {
          alert("MCQ requires at least 2 non-empty options.");
          return;
        }
      }

      await updateQuestion(editingQuestion.id, {
        question_text: editPrompt,
        question_type: editType,
        subject: editSubject,
        difficulty: editDifficulty,
        marks: Number(editMarks),
        negative_marks: Number(editNegativeMarks),
        model_answer: editModelAnswer,
        options: editType === "MCQ" ? finalOptions : [],
      });

      setSuccess(`Question #${editingQuestion.id} updated successfully!`);
      setEditingQuestion(null);
      loadQuestions();
    } catch (err: any) {
      alert(err.message || "Failed to update question.");
    }
  };

  const handleExtractQuestions = async (e: React.FormEvent) => {
    e.preventDefault();
    setExtractError("");

    const totalCount = Number(easyCount) + Number(mediumCount) + Number(hardCount);
    if (totalCount <= 0) {
      setExtractError("Please specify at least 1 question across Easy, Medium, or Hard difficulty levels.");
      return;
    }

    if (allowedTypes.length === 0) {
      setExtractError("Please select at least one question type (MCQ, Short Answer, or Long Answer).");
      return;
    }

    setIsExtracting(true);
    try {
      let result: ExtractedQuestionsResult;
      if (extractSourceTab === "file") {
        if (!uploadFile) {
          setExtractError("Please select a document file (.pdf, .docx, .txt, .md).");
          setIsExtracting(false);
          return;
        }
        result = await extractQuestionsFromFile(uploadFile, {
          subject: importSubject,
          easy_count: Number(easyCount),
          medium_count: Number(mediumCount),
          hard_count: Number(hardCount),
          question_types: allowedTypes,
        });
      } else {
        if (!webUrl.trim() || (!webUrl.trim().startsWith("http://") && !webUrl.trim().startsWith("https://"))) {
          setExtractError("Please enter a valid URL starting with http:// or https://");
          setIsExtracting(false);
          return;
        }
        result = await extractQuestionsFromUrl({
          url: webUrl.trim(),
          subject: importSubject,
          easy_count: Number(easyCount),
          medium_count: Number(mediumCount),
          hard_count: Number(hardCount),
          question_types: allowedTypes,
        });
      }

      if (!result.questions || result.questions.length === 0) {
        setExtractError("No questions could be extracted from this source. Please verify that the content has readable text.");
      } else {
        setExtractedQuestions(result.questions);
        setExtractionResult(result);
      }
    } catch (err: any) {
      setExtractError(err.message || "Failed to extract questions from the selected source.");
    } finally {
      setIsExtracting(false);
    }
  };

  const handleUpdateExtractedQuestion = (index: number, field: string, value: any) => {
    setExtractedQuestions(prev => {
      const copy = [...prev];
      copy[index] = { ...copy[index], [field]: value };
      return copy;
    });
  };

  const handleToggleExtractedOptionCorrect = (qIndex: number, optIndex: number) => {
    setExtractedQuestions(prev => {
      const copy = [...prev];
      const q = { ...copy[qIndex] };
      q.options = (q.options || []).map((opt: any, idx: number) => ({
        ...opt,
        is_correct: idx === optIndex
      }));
      copy[qIndex] = q;
      return copy;
    });
  };

  const handleRemoveExtractedQuestion = (index: number) => {
    setExtractedQuestions(prev => prev.filter((_, idx) => idx !== index));
  };

  const handleSaveBatchQuestions = async () => {
    if (extractedQuestions.length === 0) return;
    setIsSavingBatch(true);
    setExtractError("");
    try {
      await batchCreateQuestions(extractedQuestions);
      const sourceName = extractionResult?.source_name || "external source";
      setSuccess(`Successfully added ${extractedQuestions.length} questions from ${sourceName} to the Question Bank!`);
      setIsExtractModalOpen(false);
      setUploadFile(null);
      setWebUrl("");
      setExtractedQuestions([]);
      setExtractionResult(null);
      loadQuestions();
    } catch (err: any) {
      setExtractError(err.message || "Failed to batch save questions.");
    } finally {
      setIsSavingBatch(false);
    }
  };

  const handleDelete = async (id: number) => {
    if (!confirm("Are you sure you want to delete this question?")) return;
    try {
      await deleteQuestion(id);
      loadQuestions();
    } catch (err: any) {
      alert("Failed to delete question.");
    }
  };

  // Filtered Questions list
  const filteredQuestions = questions.filter((q) => {
    const matchesSearch = q.question_text.toLowerCase().includes(searchTerm.toLowerCase()) ||
                          (q.subject && q.subject.toLowerCase().includes(searchTerm.toLowerCase()));
    const matchesType = typeFilter === "ALL" || q.question_type === typeFilter;
    const matchesDifficulty = difficultyFilter === "ALL" || q.difficulty === difficultyFilter;
    return matchesSearch && matchesType && matchesDifficulty;
  });

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "1.5rem" }}>
      {/* Add New Question Form */}
      <div className="panel-card">
        <div className="panel-header">
          <h3 className="panel-title">➕ Add Question to Question Bank</h3>
          <div style={{ display: "flex", gap: "0.6rem", alignItems: "center" }}>
            <button
              type="button"
              onClick={() => {
                setIsExtractModalOpen(true);
                setExtractError("");
              }}
              className="btn btn-secondary"
              style={{
                padding: "0.45rem 1rem",
                fontSize: "0.82rem",
                display: "inline-flex",
                alignItems: "center",
                gap: "0.45rem",
                border: "1px solid var(--primary-cyan)",
                background: "rgba(6, 182, 212, 0.08)",
                color: "var(--primary-cyan)",
                fontWeight: 600,
                boxShadow: "0 0 12px rgba(6, 182, 212, 0.15)"
              }}
            >
              <span>✨</span> AI Question Extractor (Doc / URL)
            </button>
            <span className="badge badge-student">Examiner Hub</span>
          </div>
        </div>

        {error && <div className="alert-banner error"><span>⚠️</span> {error}</div>}
        {success && <div className="alert-banner success"><span>✓</span> {success}</div>}

        <form onSubmit={handleCreateQuestion}>
          <div className="form-group">
            <label className="form-label">Question Prompt</label>
            <textarea
              className="form-textarea"
              rows={3}
              placeholder="Type your question prompt, problem statement, or upload instruction..."
              value={questionText}
              onChange={(e) => setQuestionText(e.target.value)}
              required
            />
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: "1rem" }}>
            <div className="form-group">
              <label className="form-label">Question Type</label>
              <select className="form-select" value={questionType} onChange={(e) => setQuestionType(e.target.value)}>
                <option value="MCQ">Multiple Choice (MCQ)</option>
                <option value="SHORT_ANSWER">Short Answer</option>
                <option value="LONG_ANSWER">Long Answer</option>
                <option value="IMAGE_UPLOAD">Handwritten Diagram / Photo Upload</option>
              </select>
            </div>
            <div className="form-group">
              <label className="form-label">Subject Tag</label>
              <input type="text" className="form-input" value={subject} onChange={(e) => setSubject(e.target.value)} />
            </div>
            <div className="form-group">
              <label className="form-label">Difficulty Level</label>
              <select className="form-select" value={difficulty} onChange={(e) => setDifficulty(e.target.value)}>
                <option value="EASY">EASY</option>
                <option value="MEDIUM">MEDIUM</option>
                <option value="HARD">HARD</option>
              </select>
            </div>
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1rem" }}>
            <div className="form-group">
              <label className="form-label">Max Marks</label>
              <input type="number" step="0.5" className="form-input" value={marks} onChange={(e) => setMarks(Number(e.target.value))} />
            </div>
            <div className="form-group">
              <label className="form-label">Negative Marking Deduction</label>
              <input type="number" step="0.25" className="form-input" value={negativeMarks} onChange={(e) => setNegativeMarks(Number(e.target.value))} />
            </div>
          </div>

          {questionType === "MCQ" && (
            <div className="form-group">
              <label className="form-label">MCQ Options (Select the Radio Button for Correct Answer)</label>
              <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}>
                {[
                  { val: opt1, set: setOpt1, idx: 0 },
                  { val: opt2, set: setOpt2, idx: 1 },
                  { val: opt3, set: setOpt3, idx: 2 },
                  { val: opt4, set: setOpt4, idx: 3 },
                ].map((item) => (
                  <div key={item.idx} className="option-input-row">
                    <input
                      type="radio"
                      name="correctOpt"
                      checked={correctOptIndex === item.idx}
                      onChange={() => setCorrectOptIndex(item.idx)}
                      style={{ width: "18px", height: "18px", accentColor: "#2563eb" }}
                    />
                    <input
                      type="text"
                      className="form-input"
                      style={{ border: "none", background: "transparent" }}
                      placeholder={`Option ${item.idx + 1}`}
                      value={item.val}
                      onChange={(e) => item.set(e.target.value)}
                    />
                    {correctOptIndex === item.idx && (
                      <span className="badge badge-examiner" style={{ fontSize: "0.7rem" }}>Correct Answer</span>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {(questionType === "SHORT_ANSWER" || questionType === "LONG_ANSWER" || questionType === "IMAGE_UPLOAD") && (
            <div className="form-group">
              <label className="form-label">
                {questionType === "IMAGE_UPLOAD" ? "Expected Diagram Features / Rubric (AI Vision Key)" : "Model Answer / Rubric (GPT-4o Evaluator)"}
              </label>
              <textarea
                className="form-textarea"
                rows={2}
                placeholder={questionType === "IMAGE_UPLOAD" ? "Key labels, entities, and relationships expected in the diagram..." : "Model answer key used by GPT-4o for first-pass subjective grading..."}
                value={modelAnswer}
                onChange={(e) => setModelAnswer(e.target.value)}
              />
            </div>
          )}

          <button type="submit" className="btn btn-primary" style={{ width: "auto", padding: "0.75rem 2rem", marginTop: "0.5rem" }}>
            Add Question to Bank
          </button>
        </form>
      </div>

      {/* Edit Question Modal Overlay */}
      {editingQuestion && (
        <div style={{
          position: "fixed",
          inset: 0,
          background: "rgba(0, 0, 0, 0.75)",
          backdropFilter: "blur(8px)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          zIndex: 1000,
          padding: "1.5rem"
        }}>
          <div className="panel-card" style={{ maxWidth: "680px", width: "100%", maxHeight: "90vh", overflowY: "auto", border: "1px solid var(--accent-cyan)" }}>
            <div className="panel-header" style={{ marginBottom: "1rem" }}>
              <h3 className="panel-title">✏️ Edit Question #{editingQuestion.id}</h3>
              <button
                type="button"
                onClick={() => setEditingQuestion(null)}
                style={{ background: "transparent", border: "none", color: "#94a3b8", fontSize: "1.2rem", cursor: "pointer" }}
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSaveEdit}>
              <div className="form-group">
                <label className="form-label">Question Prompt</label>
                <textarea
                  className="form-textarea"
                  rows={3}
                  value={editPrompt}
                  onChange={(e) => setEditPrompt(e.target.value)}
                  required
                />
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: "1rem" }}>
                <div className="form-group">
                  <label className="form-label">Question Type</label>
                  <select className="form-select" value={editType} onChange={(e) => setEditType(e.target.value)}>
                    <option value="MCQ">Multiple Choice (MCQ)</option>
                    <option value="SHORT_ANSWER">Short Answer</option>
                    <option value="LONG_ANSWER">Long Answer</option>
                    <option value="IMAGE_UPLOAD">Handwritten Diagram / Photo Upload</option>
                  </select>
                </div>
                <div className="form-group">
                  <label className="form-label">Subject</label>
                  <input type="text" className="form-input" value={editSubject} onChange={(e) => setEditSubject(e.target.value)} />
                </div>
                <div className="form-group">
                  <label className="form-label">Difficulty</label>
                  <select className="form-select" value={editDifficulty} onChange={(e) => setEditDifficulty(e.target.value)}>
                    <option value="EASY">EASY</option>
                    <option value="MEDIUM">MEDIUM</option>
                    <option value="HARD">HARD</option>
                  </select>
                </div>
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1rem" }}>
                <div className="form-group">
                  <label className="form-label">Max Marks</label>
                  <input type="number" step="0.5" className="form-input" value={editMarks} onChange={(e) => setEditMarks(Number(e.target.value))} />
                </div>
                <div className="form-group">
                  <label className="form-label">Negative Marks</label>
                  <input type="number" step="0.25" className="form-input" value={editNegativeMarks} onChange={(e) => setEditNegativeMarks(Number(e.target.value))} />
                </div>
              </div>

              {editType === "MCQ" && (
                <div className="form-group">
                  <label className="form-label">Options (Pick radio for correct answer)</label>
                  <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}>
                    {editOptions.map((opt, idx) => (
                      <div key={idx} className="option-input-row">
                        <input
                          type="radio"
                          name="editCorrectOpt"
                          checked={opt.is_correct}
                          onChange={() => {
                            setEditOptions(editOptions.map((o, i) => ({ ...o, is_correct: i === idx })));
                          }}
                          style={{ width: "18px", height: "18px", accentColor: "#2563eb" }}
                        />
                        <input
                          type="text"
                          className="form-input"
                          style={{ border: "none", background: "transparent" }}
                          placeholder={`Option ${idx + 1}`}
                          value={opt.option_text}
                          onChange={(e) => {
                            const val = e.target.value;
                            setEditOptions(editOptions.map((o, i) => (i === idx ? { ...o, option_text: val } : o)));
                          }}
                        />
                        {opt.is_correct && (
                          <span className="badge badge-examiner" style={{ fontSize: "0.7rem" }}>Correct Answer</span>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {(editType === "SHORT_ANSWER" || editType === "LONG_ANSWER" || editType === "IMAGE_UPLOAD") && (
                <div className="form-group">
                  <label className="form-label">Model Answer / Rubric</label>
                  <textarea
                    className="form-textarea"
                    rows={3}
                    value={editModelAnswer}
                    onChange={(e) => setEditModelAnswer(e.target.value)}
                  />
                </div>
              )}

              <div style={{ display: "flex", gap: "0.75rem", justifyContent: "flex-end", marginTop: "1rem" }}>
                <button type="button" className="btn btn-secondary" onClick={() => setEditingQuestion(null)}>
                  Cancel
                </button>
                <button type="submit" className="btn btn-primary">
                  Save Changes
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Multi-Source AI Question Extractor & Generator Modal */}
      {isExtractModalOpen && (
        <div style={{
          position: "fixed",
          inset: 0,
          background: "rgba(0, 0, 0, 0.85)",
          backdropFilter: "blur(12px)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          zIndex: 1000,
          padding: "1.5rem"
        }}>
          <div className="panel-card" style={{
            maxWidth: extractedQuestions.length > 0 ? "950px" : "680px",
            width: "100%",
            maxHeight: "92vh",
            overflowY: "auto",
            border: "1px solid var(--primary-cyan)",
            boxShadow: "0 20px 40px -15px rgba(6, 182, 212, 0.25)",
            transition: "max-width 0.25s ease"
          }}>
            {/* Modal Header */}
            <div className="panel-header" style={{ marginBottom: "1.25rem", paddingBottom: "0.75rem", borderBottom: "1px solid var(--border-subtle)" }}>
              <div style={{ display: "flex", alignItems: "center", gap: "0.6rem" }}>
                <span style={{ fontSize: "1.4rem" }}>✨</span>
                <div>
                  <h3 className="panel-title" style={{ fontSize: "1.15rem", color: "#fff" }}>
                    {extractedQuestions.length > 0
                      ? `Review Extracted Questions (${extractedQuestions.length})`
                      : "AI Question Extractor & Generator"}
                  </h3>
                  <p style={{ fontSize: "0.78rem", color: "var(--text-muted)", margin: 0 }}>
                    {extractedQuestions.length > 0
                      ? `Source: ${extractionResult?.source_name || "Document/URL"} • Distribution: Easy (${extractionResult?.distribution?.actual?.easy ?? "-"}), Medium (${extractionResult?.distribution?.actual?.medium ?? "-"}), Hard (${extractionResult?.distribution?.actual?.hard ?? "-"})`
                      : "Directly import questions from PDF/DOCX documents or scrape any external website/URL with custom difficulty distribution"}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => {
                  setIsExtractModalOpen(false);
                  setExtractError("");
                  setUploadFile(null);
                  setWebUrl("");
                  setExtractedQuestions([]);
                  setExtractionResult(null);
                }}
                style={{ background: "transparent", border: "none", color: "#94a3b8", fontSize: "1.3rem", cursor: "pointer", padding: "0.25rem 0.5rem" }}
              >
                ✕
              </button>
            </div>

            {extractError && (
              <div className="alert-banner error" style={{ marginBottom: "1.25rem" }}>
                <span>⚠️</span> {extractError}
              </div>
            )}

            {extractedQuestions.length === 0 ? (
              /* Stage 1: Configure Source, Distribution, and Extract */
              <form onSubmit={handleExtractQuestions} style={{ display: "flex", flexDirection: "column", gap: "1.25rem" }}>
                {/* Source Selection Tabs */}
                <div>
                  <label className="form-label" style={{ marginBottom: "0.5rem" }}>Select Import Source</label>
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.75rem" }}>
                    <button
                      type="button"
                      onClick={() => {
                        setExtractSourceTab("file");
                        setExtractError("");
                      }}
                      style={{
                        padding: "0.85rem",
                        borderRadius: "10px",
                        border: extractSourceTab === "file" ? "2px solid var(--primary-cyan)" : "1px solid var(--border-subtle)",
                        background: extractSourceTab === "file" ? "rgba(6, 182, 212, 0.12)" : "rgba(255, 255, 255, 0.02)",
                        color: extractSourceTab === "file" ? "#38bdf8" : "#94a3b8",
                        cursor: "pointer",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        gap: "0.5rem",
                        fontWeight: 600,
                        fontSize: "0.88rem",
                        transition: "all 0.2s ease"
                      }}
                    >
                      <span style={{ fontSize: "1.2rem" }}>📄</span>
                      <span>Document File (PDF / DOCX / TXT)</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => {
                        setExtractSourceTab("url");
                        setExtractError("");
                      }}
                      style={{
                        padding: "0.85rem",
                        borderRadius: "10px",
                        border: extractSourceTab === "url" ? "2px solid var(--primary-cyan)" : "1px solid var(--border-subtle)",
                        background: extractSourceTab === "url" ? "rgba(6, 182, 212, 0.12)" : "rgba(255, 255, 255, 0.02)",
                        color: extractSourceTab === "url" ? "#38bdf8" : "#94a3b8",
                        cursor: "pointer",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        gap: "0.5rem",
                        fontWeight: 600,
                        fontSize: "0.88rem",
                        transition: "all 0.2s ease"
                      }}
                    >
                      <span style={{ fontSize: "1.2rem" }}>🌐</span>
                      <span>External Web Link / URL</span>
                    </button>
                  </div>
                </div>

                {/* Source Input Body */}
                {extractSourceTab === "file" ? (
                  <div style={{
                    padding: "1.75rem",
                    border: "2px dashed var(--border-subtle)",
                    borderRadius: "12px",
                    background: "rgba(255, 255, 255, 0.02)",
                    textAlign: "center",
                    cursor: "pointer",
                    position: "relative"
                  }}>
                    <div style={{ fontSize: "2.5rem", marginBottom: "0.5rem" }}>
                      {uploadFile?.name.endsWith(".docx") ? "📝" : uploadFile?.name.endsWith(".txt") ? "📑" : "📄"}
                    </div>
                    <h4 style={{ fontSize: "1.05rem", fontWeight: 700, color: "#fff", marginBottom: "0.25rem" }}>
                      {uploadFile ? uploadFile.name : "Select or Drop Question Document"}
                    </h4>
                    <p style={{ fontSize: "0.82rem", color: "var(--text-muted)" }}>
                      {uploadFile
                        ? `${(uploadFile.size / 1024).toFixed(1)} KB • Click or drop to replace`
                        : "Supports PDF (.pdf), Microsoft Word (.docx), and Plain Text (.txt, .md)"}
                    </p>
                    <input
                      type="file"
                      accept=".pdf,.docx,.txt,.md,application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document,text/plain"
                      onChange={(e) => {
                        if (e.target.files && e.target.files[0]) {
                          setUploadFile(e.target.files[0]);
                          setExtractError("");
                        }
                      }}
                      style={{
                        position: "absolute",
                        inset: 0,
                        opacity: 0,
                        cursor: "pointer"
                      }}
                    />
                  </div>
                ) : (
                  <div className="form-group" style={{ margin: 0 }}>
                    <label className="form-label">
                      External Website or Documentation URL
                    </label>
                    <div style={{ position: "relative" }}>
                      <input
                        type="url"
                        className="form-input"
                        placeholder="https://en.wikipedia.org/wiki/Operating_system or https://docs.python.org/..."
                        value={webUrl}
                        onChange={(e) => {
                          setWebUrl(e.target.value);
                          setExtractError("");
                        }}
                        style={{ paddingLeft: "2.4rem" }}
                      />
                      <span style={{ position: "absolute", left: "0.85rem", top: "50%", transform: "translateY(-50%)", fontSize: "1.1rem" }}>
                        🌐
                      </span>
                    </div>
                    <p style={{ fontSize: "0.75rem", color: "var(--text-muted)", marginTop: "0.35rem" }}>
                      💡 The AI scraper extracts body text from the webpage (filtering out navigation headers, sidebars, and footers) to generate questions.
                    </p>
                  </div>
                )}

                {/* Subject / Topic Tag */}
                <div className="form-group" style={{ margin: 0 }}>
                  <label className="form-label">Subject / Topic Tag</label>
                  <input
                    type="text"
                    className="form-input"
                    value={importSubject}
                    onChange={(e) => setImportSubject(e.target.value)}
                    placeholder="e.g. Computer Science, Machine Learning, Operating Systems"
                  />
                </div>

                {/* Difficulty Distribution Configuration */}
                <div style={{
                  padding: "1rem 1.25rem",
                  background: "rgba(15, 23, 42, 0.6)",
                  border: "1px solid var(--border-subtle)",
                  borderRadius: "10px"
                }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "0.75rem" }}>
                    <div>
                      <h4 style={{ fontSize: "0.92rem", fontWeight: 700, color: "#fff", margin: 0 }}>
                        🎯 Question Count & Difficulty Distribution
                      </h4>
                      <p style={{ fontSize: "0.75rem", color: "var(--text-muted)", margin: 0 }}>
                        Set how many questions to extract for each difficulty level
                      </p>
                    </div>
                    <span className="badge" style={{ background: "rgba(6, 182, 212, 0.15)", color: "var(--primary-cyan)", border: "1px solid rgba(6, 182, 212, 0.3)", fontSize: "0.82rem", fontWeight: 700 }}>
                      Total: {Number(easyCount) + Number(mediumCount) + Number(hardCount)} Questions
                    </span>
                  </div>

                  <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: "0.75rem" }}>
                    {/* Easy Counter */}
                    <div style={{
                      padding: "0.75rem",
                      background: "rgba(16, 185, 129, 0.06)",
                      border: "1px solid rgba(16, 185, 129, 0.25)",
                      borderRadius: "8px"
                    }}>
                      <div style={{ display: "flex", alignItems: "center", gap: "0.4rem", marginBottom: "0.4rem" }}>
                        <span style={{ fontSize: "0.85rem" }}>🟢</span>
                        <label style={{ fontSize: "0.82rem", fontWeight: 700, color: "#34d399", margin: 0 }}>
                          Easy Questions
                        </label>
                      </div>
                      <input
                        type="number"
                        min="0"
                        max="50"
                        className="form-input"
                        value={easyCount}
                        onChange={(e) => setEasyCount(Math.max(0, parseInt(e.target.value) || 0))}
                        style={{ fontSize: "0.95rem", fontWeight: 700, color: "#34d399", textAlign: "center" }}
                      />
                    </div>

                    {/* Medium Counter */}
                    <div style={{
                      padding: "0.75rem",
                      background: "rgba(245, 158, 11, 0.06)",
                      border: "1px solid rgba(245, 158, 11, 0.25)",
                      borderRadius: "8px"
                    }}>
                      <div style={{ display: "flex", alignItems: "center", gap: "0.4rem", marginBottom: "0.4rem" }}>
                        <span style={{ fontSize: "0.85rem" }}>🟡</span>
                        <label style={{ fontSize: "0.82rem", fontWeight: 700, color: "#fbbf24", margin: 0 }}>
                          Medium Questions
                        </label>
                      </div>
                      <input
                        type="number"
                        min="0"
                        max="50"
                        className="form-input"
                        value={mediumCount}
                        onChange={(e) => setMediumCount(Math.max(0, parseInt(e.target.value) || 0))}
                        style={{ fontSize: "0.95rem", fontWeight: 700, color: "#fbbf24", textAlign: "center" }}
                      />
                    </div>

                    {/* Hard Counter */}
                    <div style={{
                      padding: "0.75rem",
                      background: "rgba(239, 68, 68, 0.06)",
                      border: "1px solid rgba(239, 68, 68, 0.25)",
                      borderRadius: "8px"
                    }}>
                      <div style={{ display: "flex", alignItems: "center", gap: "0.4rem", marginBottom: "0.4rem" }}>
                        <span style={{ fontSize: "0.85rem" }}>🔴</span>
                        <label style={{ fontSize: "0.82rem", fontWeight: 700, color: "#f87171", margin: 0 }}>
                          Hard Questions
                        </label>
                      </div>
                      <input
                        type="number"
                        min="0"
                        max="50"
                        className="form-input"
                        value={hardCount}
                        onChange={(e) => setHardCount(Math.max(0, parseInt(e.target.value) || 0))}
                        style={{ fontSize: "0.95rem", fontWeight: 700, color: "#f87171", textAlign: "center" }}
                      />
                    </div>
                  </div>
                </div>

                {/* Allowed Question Types */}
                <div>
                  <label className="form-label" style={{ marginBottom: "0.4rem" }}>Allowed Question Types</label>
                  <div style={{ display: "flex", gap: "1rem", flexWrap: "wrap" }}>
                    {[
                      { id: "MCQ", label: "Multiple Choice (MCQ)" },
                      { id: "SHORT_ANSWER", label: "Short Answer" },
                      { id: "LONG_ANSWER", label: "Long Answer" },
                    ].map(t => {
                      const isChecked = allowedTypes.includes(t.id);
                      return (
                        <label
                          key={t.id}
                          style={{
                            display: "flex",
                            alignItems: "center",
                            gap: "0.5rem",
                            fontSize: "0.82rem",
                            color: isChecked ? "#e2e8f0" : "#64748b",
                            cursor: "pointer"
                          }}
                        >
                          <input
                            type="checkbox"
                            checked={isChecked}
                            onChange={(e) => {
                              if (e.target.checked) {
                                setAllowedTypes([...allowedTypes, t.id]);
                              } else {
                                setAllowedTypes(allowedTypes.filter(x => x !== t.id));
                              }
                            }}
                            style={{ accentColor: "var(--primary-cyan)", cursor: "pointer" }}
                          />
                          {t.label}
                        </label>
                      );
                    })}
                  </div>
                </div>

                {/* Submit / Cancel Actions */}
                <div style={{ display: "flex", gap: "0.75rem", justifyContent: "flex-end", paddingTop: "0.5rem" }}>
                  <button
                    type="button"
                    className="btn btn-secondary"
                    onClick={() => {
                      setIsExtractModalOpen(false);
                      setExtractError("");
                    }}
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="btn btn-primary"
                    disabled={
                      isExtracting ||
                      (extractSourceTab === "file" && !uploadFile) ||
                      (extractSourceTab === "url" && !webUrl.trim()) ||
                      (Number(easyCount) + Number(mediumCount) + Number(hardCount) <= 0)
                    }
                    style={{
                      display: "inline-flex",
                      alignItems: "center",
                      gap: "0.5rem",
                      padding: "0.6rem 1.4rem"
                    }}
                  >
                    {isExtracting ? (
                      <>
                        <span style={{ animation: "spin 1s linear infinite", display: "inline-block" }}>⚙️</span>
                        Extracting & Generating Questions...
                      </>
                    ) : (
                      `⚡ Extract & Generate (${Number(easyCount) + Number(mediumCount) + Number(hardCount)}) Questions`
                    )}
                  </button>
                </div>
              </form>
            ) : (
              /* Stage 2: Review & Verify Extracted Questions */
              <div>
                <div style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  padding: "0.85rem 1rem",
                  background: "rgba(16, 185, 129, 0.08)",
                  border: "1px solid rgba(16, 185, 129, 0.3)",
                  borderRadius: "8px",
                  marginBottom: "1rem",
                  fontSize: "0.85rem",
                  color: "#34d399",
                  flexWrap: "wrap",
                  gap: "0.5rem"
                }}>
                  <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", flexWrap: "wrap" }}>
                    <span>✓ Successfully extracted <strong>{extractedQuestions.length} questions</strong></span>
                    <span style={{ color: "var(--text-muted)" }}>•</span>
                    <span style={{ fontSize: "0.78rem", color: "#cbd5e1" }}>
                      Source: <strong>{extractionResult?.source_name || (uploadFile ? uploadFile.name : webUrl)}</strong>
                    </span>
                    <span style={{ color: "var(--text-muted)" }}>•</span>
                    <span style={{ fontSize: "0.78rem" }}>
                      🟢 {extractedQuestions.filter(q => q.difficulty === "EASY").length} Easy / 🟡 {extractedQuestions.filter(q => q.difficulty === "MEDIUM").length} Med / 🔴 {extractedQuestions.filter(q => q.difficulty === "HARD").length} Hard
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      setExtractedQuestions([]);
                      setExtractionResult(null);
                    }}
                    style={{
                      background: "transparent",
                      border: "none",
                      color: "#94a3b8",
                      cursor: "pointer",
                      fontSize: "0.78rem",
                      textDecoration: "underline"
                    }}
                  >
                    ← Re-configure Source
                  </button>
                </div>

                <div style={{ display: "flex", flexDirection: "column", gap: "1rem", maxHeight: "55vh", overflowY: "auto", paddingRight: "0.25rem" }}>
                  {extractedQuestions.map((q, idx) => (
                    <div
                      key={idx}
                      style={{
                        padding: "1rem",
                        background: "rgba(255, 255, 255, 0.02)",
                        border: "1px solid var(--border-subtle)",
                        borderRadius: "8px"
                      }}
                    >
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "0.75rem", gap: "0.5rem", flexWrap: "wrap" }}>
                        <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
                          <span style={{
                            width: "24px",
                            height: "24px",
                            borderRadius: "50%",
                            background: "rgba(37, 99, 235, 0.25)",
                            color: "#60a5fa",
                            display: "inline-flex",
                            alignItems: "center",
                            justifyContent: "center",
                            fontWeight: 700,
                            fontSize: "0.75rem"
                          }}>
                            #{idx + 1}
                          </span>
                          <select
                            className="form-select"
                            style={{ padding: "0.25rem 0.5rem", fontSize: "0.78rem", width: "auto" }}
                            value={q.question_type}
                            onChange={(e) => handleUpdateExtractedQuestion(idx, "question_type", e.target.value)}
                          >
                            <option value="MCQ">MCQ</option>
                            <option value="SHORT_ANSWER">Short Answer</option>
                            <option value="LONG_ANSWER">Long Answer</option>
                            <option value="IMAGE_UPLOAD">Diagram Upload</option>
                          </select>
                          <select
                            className="form-select"
                            style={{
                              padding: "0.25rem 0.5rem",
                              fontSize: "0.78rem",
                              width: "auto",
                              color: q.difficulty === "HARD" ? "#f87171" : q.difficulty === "EASY" ? "#34d399" : "#fbbf24",
                              fontWeight: 700
                            }}
                            value={q.difficulty || "MEDIUM"}
                            onChange={(e) => handleUpdateExtractedQuestion(idx, "difficulty", e.target.value)}
                          >
                            <option value="EASY">🟢 EASY</option>
                            <option value="MEDIUM">🟡 MEDIUM</option>
                            <option value="HARD">🔴 HARD</option>
                          </select>
                        </div>

                        <div style={{ display: "flex", alignItems: "center", gap: "0.6rem" }}>
                          <label style={{ fontSize: "0.75rem", color: "var(--text-muted)" }}>
                            Marks:
                            <input
                              type="number"
                              step="0.5"
                              value={q.marks}
                              onChange={(e) => handleUpdateExtractedQuestion(idx, "marks", Number(e.target.value))}
                              style={{ width: "55px", padding: "0.2rem 0.4rem", marginLeft: "0.3rem", background: "rgba(0,0,0,0.3)", border: "1px solid var(--border-subtle)", borderRadius: "4px", color: "#fff", fontSize: "0.78rem" }}
                            />
                          </label>
                          <button
                            type="button"
                            onClick={() => handleRemoveExtractedQuestion(idx)}
                            className="btn btn-danger"
                            style={{ padding: "0.25rem 0.5rem", fontSize: "0.72rem" }}
                          >
                            🗑️ Remove
                          </button>
                        </div>
                      </div>

                      {/* Question Prompt */}
                      <textarea
                        className="form-textarea"
                        rows={2}
                        value={q.question_text}
                        onChange={(e) => handleUpdateExtractedQuestion(idx, "question_text", e.target.value)}
                        style={{ fontSize: "0.88rem", marginBottom: "0.6rem" }}
                      />

                      {/* Options for MCQ */}
                      {q.question_type === "MCQ" && q.options && q.options.length > 0 && (
                        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.4rem" }}>
                          {q.options.map((opt: any, optIdx: number) => (
                            <div
                              key={optIdx}
                              style={{
                                display: "flex",
                                alignItems: "center",
                                gap: "0.4rem",
                                padding: "0.35rem 0.6rem",
                                background: opt.is_correct ? "rgba(16, 185, 129, 0.1)" : "rgba(0,0,0,0.2)",
                                border: `1px solid ${opt.is_correct ? "rgba(16, 185, 129, 0.3)" : "var(--border-subtle)"}`,
                                borderRadius: "6px"
                              }}
                            >
                              <input
                                type="radio"
                                name={`q_opt_${idx}`}
                                checked={opt.is_correct}
                                onChange={() => handleToggleExtractedOptionCorrect(idx, optIdx)}
                                style={{ accentColor: "#10b981", cursor: "pointer" }}
                              />
                              <input
                                type="text"
                                value={opt.option_text}
                                onChange={(e) => {
                                  const newOpts = [...q.options];
                                  newOpts[optIdx] = { ...opt, option_text: e.target.value };
                                  handleUpdateExtractedQuestion(idx, "options", newOpts);
                                }}
                                style={{ border: "none", background: "transparent", color: opt.is_correct ? "#34d399" : "#e2e8f0", fontSize: "0.8rem", width: "100%" }}
                              />
                            </div>
                          ))}
                        </div>
                      )}

                      {/* Model answer if Short / Long answer */}
                      {q.question_type !== "MCQ" && (
                        <input
                          type="text"
                          className="form-input"
                          style={{ fontSize: "0.78rem", padding: "0.35rem 0.6rem" }}
                          placeholder="Model answer or rubric key..."
                          value={q.model_answer || ""}
                          onChange={(e) => handleUpdateExtractedQuestion(idx, "model_answer", e.target.value)}
                        />
                      )}
                    </div>
                  ))}
                </div>

                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: "1.25rem", paddingTop: "1rem", borderTop: "1px solid var(--border-subtle)" }}>
                  <button
                    type="button"
                    className="btn btn-secondary"
                    onClick={() => {
                      setIsExtractModalOpen(false);
                      setExtractedQuestions([]);
                      setExtractionResult(null);
                      setUploadFile(null);
                      setWebUrl("");
                    }}
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    className="btn btn-primary"
                    disabled={isSavingBatch || extractedQuestions.length === 0}
                    onClick={handleSaveBatchQuestions}
                    style={{ padding: "0.6rem 1.5rem", display: "inline-flex", alignItems: "center", gap: "0.5rem" }}
                  >
                    {isSavingBatch ? "Saving to Question Bank..." : `✓ Confirm & Add All (${extractedQuestions.length}) to Bank`}
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Question Bank Explorer with Search & Filter Chips */}
      <div className="panel-card">
        <div className="panel-header">
          <h3 className="panel-title">📚 Question Bank Explorer ({filteredQuestions.length})</h3>
        </div>

        {/* Live Search & Filter Bar */}
        <div style={{ marginBottom: "1.25rem" }}>
          <div className="form-group">
            <input
              type="text"
              className="form-input"
              placeholder="🔍 Search questions by keyword or subject..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>

          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "0.75rem" }}>
            <div className="filter-chip-bar">
              <span style={{ fontSize: "0.78rem", fontWeight: 700, color: "#64748b", display: "inline-flex", alignItems: "center" }}>Type:</span>
              {["ALL", "MCQ", "SHORT_ANSWER", "LONG_ANSWER", "IMAGE_UPLOAD"].map((t) => (
                <button
                  key={t}
                  type="button"
                  className={`filter-chip ${typeFilter === t ? "active" : ""}`}
                  onClick={() => setTypeFilter(t)}
                >
                  {t}
                </button>
              ))}
            </div>

            <div className="filter-chip-bar">
              <span style={{ fontSize: "0.78rem", fontWeight: 700, color: "#64748b", display: "inline-flex", alignItems: "center" }}>Difficulty:</span>
              {["ALL", "EASY", "MEDIUM", "HARD"].map((d) => (
                <button
                  key={d}
                  type="button"
                  className={`filter-chip ${difficultyFilter === d ? "active" : ""}`}
                  onClick={() => setDifficultyFilter(d)}
                >
                  {d}
                </button>
              ))}
            </div>
          </div>
        </div>

        {loading ? (
          <p>Loading questions...</p>
        ) : filteredQuestions.length === 0 ? (
          <p style={{ color: "#64748b", fontSize: "0.9rem" }}>No matching questions found.</p>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: "0.85rem" }}>
            {filteredQuestions.map((q) => (
              <div key={q.id} style={{
                padding: "1.25rem",
                border: "1px solid var(--border-subtle)",
                borderRadius: "12px",
                background: "rgba(15, 23, 42, 0.65)",
                backdropFilter: "blur(12px)",
                boxShadow: "var(--shadow-sm)"
              }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: "1rem" }}>
                  <div>
                    <div style={{ display: "flex", gap: "0.4rem", marginBottom: "0.5rem", flexWrap: "wrap" }}>
                      <span className="badge badge-student">{q.question_type}</span>
                      <span className="badge badge-examiner">{q.difficulty}</span>
                      <span className="badge badge-admin">+{q.marks} Marks</span>
                      {q.negative_marks > 0 && (
                        <span className="badge badge-danger">-{q.negative_marks} Neg</span>
                      )}
                      {q.subject && (
                        <span className="badge" style={{ background: "rgba(99, 102, 241, 0.15)", color: "#818cf8", border: "1px solid rgba(99, 102, 241, 0.3)" }}>{q.subject}</span>
                      )}
                    </div>
                    <h4 style={{ fontSize: "1rem", fontWeight: 700, color: "#fff", lineHeight: 1.5 }}>{q.question_text}</h4>
                    {q.model_answer && (
                      <p style={{ fontSize: "0.82rem", color: "#94a3b8", marginTop: "0.35rem" }}>
                        <strong style={{ color: "#cbd5e1" }}>Rubric:</strong> {q.model_answer}
                      </p>
                    )}
                  </div>
                  <div style={{ display: "flex", gap: "0.5rem" }}>
                    <button
                      onClick={() => handleStartEdit(q)}
                      className="btn btn-secondary"
                      style={{ padding: "0.35rem 0.75rem", fontSize: "0.78rem" }}
                    >
                      ✏️ Edit
                    </button>
                    <button
                      onClick={() => handleDelete(q.id)}
                      className="btn btn-danger"
                      style={{ padding: "0.35rem 0.75rem", fontSize: "0.78rem" }}
                    >
                      Delete
                    </button>
                  </div>
                </div>
                {q.options && q.options.length > 0 && (
                  <div style={{ marginTop: "0.75rem", display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.5rem", fontSize: "0.82rem" }}>
                    {q.options.map((opt: any) => (
                      <div
                        key={opt.id || opt.option_text}
                        style={{
                          padding: "0.5rem 0.85rem",
                          borderRadius: "8px",
                          background: opt.is_correct ? "rgba(16, 185, 129, 0.12)" : "rgba(255, 255, 255, 0.03)",
                          border: `1px solid ${opt.is_correct ? "rgba(16, 185, 129, 0.35)" : "var(--border-subtle)"}`,
                          color: opt.is_correct ? "#34d399" : "var(--text-secondary)",
                          fontWeight: opt.is_correct ? 700 : 400
                        }}
                      >
                        {opt.is_correct ? "✓ " : "• "}{opt.option_text}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
