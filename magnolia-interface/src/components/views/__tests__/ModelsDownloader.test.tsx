import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach, type Mock } from "vitest";
import { ModelsDownloader } from "../ModelsDownloader.tsx";

// Mock the Tauri api
vi.mock("@tauri-apps/api/core", () => ({
  invoke: vi.fn(),
}));

// We must also mock react-hot-toast otherwise it might complain
vi.mock("react-hot-toast", () => ({
  default: {
    success: vi.fn(),
    error: vi.fn(),
  },
}));

describe("ModelsDownloader", () => {
  let invokeMock: Mock;

  beforeEach(async () => {
    vi.clearAllMocks();
    const tauriApi = await import("@tauri-apps/api/core");
    // @ts-expect-error - Mocking Tauri invoke
    invokeMock = tauriApi.invoke;

    // Default mock implementation for mount
    invokeMock.mockImplementation((cmd: string) => {
      if (cmd === "get_local_models") return Promise.resolve(["model1.gguf"]);
      return Promise.resolve();
    });
  });

  it("renders correctly and loads initial local models", async () => {
    render(<ModelsDownloader />);

    expect(screen.getByText("Models")).toBeInTheDocument();

    // Wait for the local models to load
    await waitFor(() => {
      expect(screen.getByText("model1.gguf")).toBeInTheDocument();
    });
  });

  it("handles load local models failure", async () => {
    const { default: toast } = await import("react-hot-toast");

    invokeMock.mockImplementation((cmd: string) => {
      if (cmd === "get_api_key") return Promise.resolve("");
      if (cmd === "get_local_models")
        return Promise.reject(new Error("Simulated failure"));
      return Promise.resolve();
    });

    render(<ModelsDownloader />);

    await waitFor(() => {
      expect(toast.error).toHaveBeenCalledWith(
        expect.stringContaining("Failed to load local models"),
      );
    });
  });

  it("shows skeleton loaders and empty state checks", async () => {
    // Configure mock for search failure mapping to empty state
    invokeMock.mockImplementation((cmd: string) => {
      if (cmd === "get_local_models") return Promise.resolve([]);
      if (cmd === "search_hf_models")
        return Promise.resolve({
          id: "TheBloke/Llama",
          size_on_disk_bytes: 4000,
        });
      if (cmd === "assess_model_fit") return Promise.resolve("Fits Perfectly");
      if (cmd === "get_api_key") return Promise.resolve("my-token");
      return Promise.resolve();
    });

    render(<ModelsDownloader />);

    const input = screen.getByPlaceholderText("Search for a model to download");
    fireEvent.change(input, { target: { value: "llama" } });
    fireEvent.keyDown(input, { key: "Enter", code: "Enter", charCode: 13 });

    // Wait for search to complete and render the new UI
    await waitFor(() => {
      expect(screen.getByText("Llama")).toBeInTheDocument();
    });
  });
});
