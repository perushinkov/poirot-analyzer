export abstract class AbstractFileStorage {
  /** False is returned if file already exists, or write error occurs. */
  abstract save(path: string, content: string): boolean;
  abstract exists(path: string): boolean;

  /** null is returned if file doesn't exist, or read error occurs */
  abstract load(path: string): string;
  abstract listPaths(): string[];
}
