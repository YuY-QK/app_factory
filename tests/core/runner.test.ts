import { describe, it, expect } from "vitest";
import { detectFlutterCli, runCommand } from "../../src/core/runner.js";

describe("Runner and CLI Detection", () => {
  it("detects system tool availability", async () => {
    const tool = await detectFlutterCli();
    expect(tool).not.toBeNull();
    if (tool) {
      expect(["fvm", "flutter"]).toContain(tool.command);
    }
  });

  it("successfully runs a valid command", async () => {
    await expect(runCommand("node", ["-v"], process.cwd())).resolves.not.toThrow();
  });
});
