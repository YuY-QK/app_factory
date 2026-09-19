import { execa, Options as ExecaOptions } from "execa";

export async function isCommandAvailable(command: string): Promise<boolean> {
  try {
    await execa("which", [command]);
    return true;
  } catch {
    return false;
  }
}

export async function detectFlutterCli(): Promise<{ command: string; isFvm: boolean } | null> {
  if (await isCommandAvailable("fvm")) {
    return { command: "fvm", isFvm: true };
  }
  if (await isCommandAvailable("flutter")) {
    return { command: "flutter", isFvm: false };
  }
  return null;
}

export async function runCommand(
  cmd: string,
  args: string[],
  cwd: string,
  options?: ExecaOptions
): Promise<void> {
  await execa(cmd, args, {
    cwd,
    stdio: options?.stdio || "inherit",
    ...options,
  });
}
