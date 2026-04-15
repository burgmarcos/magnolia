import { useState, useEffect } from "react";
import {
  Search,
  ArrowDownToLine,
  Trash2,
  Key,
  ShieldCheck,
  RefreshCw,
  ExternalLink,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import toast from "react-hot-toast";
import { HardwareFitChip, type FitState } from "../widgets/HardwareFitChip.tsx";
import { LoadingAnimation } from "../common/LoadingAnimation";
import { invoke } from "@tauri-apps/api/core";
import styles from "./ModelsDownloader.module.css";

interface ModelItem {
  id: string;
  name: string;
  description: string;
  fit: FitState;
  status: "available" | "downloading" | "installed";
  progress?: number;
}

const iconBtnStyle = {
  padding: "6px",
  borderRadius: "8px",
  border: "none",
  background: "transparent",
  cursor: "pointer",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  color: "var(--schemes-on-surface-variant)",
  transition: "all 0.2s",
};

export function ModelsDownloader() {
  const [searchQuery, setSearchQuery] = useState("");
  const [models, setModels] = useState<ModelItem[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [hfToken, setHfToken] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const [showKeyInput, setShowKeyInput] = useState(false);

  useEffect(() => {
    // Load HF Token and local models

    invoke<string>("get_api_key", { service: "huggingface" })
      .then((token) => {
        if (token) setHfToken(token);
      })
      .catch(console.error);

    invoke<string[]>("get_local_models")
      .then(async (localModels) => {
        const installed: ModelItem[] = await Promise.all(
          localModels.map(async (name) => {
            let fit: FitState = "cannot-run";
            try {
              const sizeBytes = await invoke<number>(
                "get_local_model_size_bytes",
                { modelName: name },
              );
              const fitStatus = await invoke<string>("assess_model_fit", {
                modelSizeBytes: sizeBytes,
              });
              if (fitStatus === "Fits Perfectly") fit = "perfect";
              else if (fitStatus === "Needs Offload") fit = "offload";
            } catch {
              fit = "cannot-run";
            }
            return {
              id: name,
              name,
              description: "Local model",
              fit,
              status: "installed" as const,
            };
          }),
        );
        setModels(installed);
      })
      .catch((e) => {
        toast.error(`Failed to load local models: ${String(e)}`);
      });
  }, []);

  const verifyHfToken = async () => {
    if (!hfToken) return toast.error("Enter a token first!");
    setIsSaving(true);
    try {
      const msg = await invoke<string>("verify_hf_token", { token: hfToken });
      toast.success(msg);
    } catch (e) {
      toast.error(`Validation Failed: ${String(e)}`);
    } finally {
      setIsSaving(false);
    }
  };

  const saveHfToken = async () => {
    setIsSaving(true);
    try {
      await invoke("set_api_key", { service: "huggingface", key: hfToken });
      toast.success("Key saved securely");
    } catch (e) {
      toast.error(`Key Vault Error: ${String(e)}`);
    } finally {
      setIsSaving(false);
    }
  };

  const handleSearch = async () => {
    if (!searchQuery.trim()) return;
    setIsSearching(true);
    try {
      const info = await invoke<{ id: string; size_on_disk_bytes: number }>(
        "search_hf_models",
        { modelId: searchQuery },
      );
      const fitStatus = await invoke<string>("assess_model_fit", {
        modelSizeBytes: info.size_on_disk_bytes,
      });

      let fit: FitState = "cannot-run";
      if (fitStatus === "Fits Perfectly") fit = "perfect";
      if (fitStatus === "Needs Offload") fit = "offload";

      setModels((prev) => [
        {
          id: info.id,
          name: info.id.split("/").pop() || info.id,
          description: `Size: ${(info.size_on_disk_bytes / 1024 / 1024 / 1024).toFixed(2)} GB`,
          fit,
          status: "available",
        },
        ...prev.filter((m) => m.id !== info.id),
      ]);
    } catch (e) {
      const errorMsg = e instanceof Error ? e.message : String(e);
      console.error("Search failed:", errorMsg);

      if (errorMsg.includes("401")) {
        toast.error(
          "HuggingFace Access Denied. Please verify your API Key in System Hub.",
          { duration: 5000 },
        );
      } else {
        toast.error(`Search failed: ${errorMsg}`);
      }
    } finally {
      setIsSearching(false);
    }
  };

  const downloadModel = async (model: ModelItem) => {
    setModels((prev) =>
      prev.map((m) =>
        m.id === model.id ? { ...m, status: "downloading", progress: 0 } : m,
      ),
    );
    try {
      // A full URL would normally be determined by the HF tree API
      const url = `https://huggingface.co/${model.id}/resolve/main/model.gguf`;
      const filename = `${model.id.replace("/", "_")}.gguf`;

      toast.success(`Started downloading ${model.name}`);

      await invoke("download_model_file", { url, filename });

      setModels((prev) =>
        prev.map((m) =>
          m.id === model.id ? { ...m, status: "installed", progress: 100 } : m,
        ),
      );
      toast.success(`${model.name} downloaded successfully!`);
    } catch {
      console.error("Download failed");
      toast.error("Download failed. Ensure your HuggingFace Token is valid.");
      setModels((prev) =>
        prev.map((m) =>
          m.id === model.id
            ? { ...m, status: "available", progress: undefined }
            : m,
        ),
      );
    }
  };

  const filteredModels = models.filter((m) =>
    m.name.toLowerCase().includes(searchQuery.toLowerCase()),
  );

  return (
    <div className={styles.container}>
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          marginBottom: "24px",
        }}
      >
        <h2 className={styles.header} style={{ margin: 0 }}>
          Models
        </h2>

        {/* Credentials Header Section - Compact Toggle */}
        <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
          <AnimatePresence>
            {showKeyInput && (
              <motion.div
                initial={{ width: 0, opacity: 0 }}
                animate={{ width: "auto", opacity: 1 }}
                exit={{ width: 0, opacity: 0 }}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "8px",
                  background: "var(--schemes-surface-container)",
                  padding: "4px 12px",
                  borderRadius: "12px",
                  border: "1px solid var(--schemes-outline-variant)",
                  overflow: "hidden",
                }}
              >
                <input
                  type="password"
                  placeholder="hf_..."
                  value={hfToken}
                  onChange={(e) => setHfToken(e.target.value)}
                  style={{
                    background: "transparent",
                    border: "none",
                    color: "var(--schemes-on-surface)",
                    fontSize: "12px",
                    width: "140px",
                    outline: "none",
                  }}
                />
                <button
                  onClick={verifyHfToken}
                  disabled={isSaving}
                  style={iconBtnStyle}
                  title="Verify Token"
                >
                  <RefreshCw
                    size={14}
                    className={isSaving ? "animate-spin" : ""}
                  />
                </button>
                <button
                  onClick={saveHfToken}
                  disabled={isSaving}
                  style={iconBtnStyle}
                  title="Save Token"
                >
                  <ShieldCheck size={14} />
                </button>
              </motion.div>
            )}
          </AnimatePresence>

          <button
            onClick={() => setShowKeyInput(!showKeyInput)}
            style={{
              ...iconBtnStyle,
              background: showKeyInput
                ? "var(--schemes-primary-container)"
                : "var(--schemes-surface-container)",
              border: "1px solid var(--schemes-outline-variant)",
              color: showKeyInput
                ? "var(--schemes-on-primary-container)"
                : "var(--schemes-on-surface-variant)",
              padding: "8px",
            }}
          >
            <Key size={18} />
          </button>

          <button
            onClick={() => {
              window.dispatchEvent(
                new CustomEvent("Magnolia-open-app", {
                  detail: {
                    type: "browser",
                    title: "Browser",
                    url: "https://huggingface.co/settings/tokens",
                  },
                }),
              );
            }}
            style={{
              ...iconBtnStyle,
              color: "var(--schemes-primary)",
              gap: "6px",
              width: "auto",
              padding: "8px 12px",
            }}
          >
            <ExternalLink size={14} />{" "}
            <span style={{ fontSize: "11px", fontWeight: 600 }}>Get Token</span>
          </button>
        </div>
      </div>

      {/* Search Bar matching Figma Node */}
      <div className={styles.searchContainer}>
        <Search
          size={20}
          color="var(--schemes-on-surface-variant)"
          className={styles.searchIcon}
        />
        <input
          type="text"
          className={styles.searchInput}
          placeholder="Search for a model to download"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && handleSearch()}
        />
      </div>

      {/* List of Models */}
      <div className={styles.cardList}>
        {isSearching ? (
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              justifyContent: "center",
              padding: "60px",
              gap: "16px",
              width: "100%",
            }}
          >
            <LoadingAnimation />
            <p
              style={{
                color: "var(--schemes-on-surface-variant)",
                fontSize: "13px",
                fontWeight: 500,
              }}
            >
              Scanning Hugging Face Hub...
            </p>
          </div>
        ) : filteredModels.length === 0 ? (
          <div className={styles.emptyState}>
            <Search size={48} opacity={0.5} />
            <p>No models found. Try searching for a HuggingFace Model ID.</p>
          </div>
        ) : (
          filteredModels.map((model) => (
            <div key={model.id} className={styles.modelItemWrapper}>
              <div className={styles.horizontalCard}>
                <div className={styles.cardContent}>
                  <p className={styles.cardTitle}>{model.name}</p>
                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: "8px",
                      marginTop: "2px",
                    }}
                  >
                    <p className={styles.cardDescription}>
                      {model.description}
                    </p>
                    {/* Hardware Fit Indicator */}
                    <HardwareFitChip fitState={model.fit} />
                  </div>
                </div>

                {/* Media/Action Buttons */}
                <div className={styles.cardMedia}>
                  {model.status === "available" ||
                  model.status === "downloading" ? (
                    <button
                      className={styles.actionIconButton}
                      aria-label="Download Model"
                      onClick={() => downloadModel(model)}
                      disabled={model.status === "downloading"}
                    >
                      <ArrowDownToLine
                        size={24}
                        color="var(--schemes-on-surface)"
                      />
                    </button>
                  ) : (
                    <button
                      className={styles.actionIconButton}
                      aria-label="Delete Model"
                    >
                      <Trash2 size={24} color="var(--schemes-on-surface)" />
                    </button>
                  )}
                </div>
              </div>

              {/* Download Progress Indicator (Wavy / Linear) */}
              {model.status === "downloading" &&
                model.progress !== undefined && (
                  <div className={styles.progressWrapper}>
                    <div
                      className={styles.progressBar}
                      style={{ width: `${model.progress}%` }}
                    />
                  </div>
                )}
            </div>
          ))
        )}
      </div>
    </div>
  );
}
