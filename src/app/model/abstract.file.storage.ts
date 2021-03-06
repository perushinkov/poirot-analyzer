export abstract class AbstractFileStorage {
  /** False is returned if file already exists, or write error occurs. */
  abstract save(path: string, content: string): boolean;
  abstract exists(path: string): boolean;

  /** null is returned if file doesn't exist, or read error occurs */
  abstract load(path: string): string;

  /**
   * CONTRACT:
   *  1. When operation fails, returns a null.
   *  2. When operation does not, returns a list of paths
   *  - within a larger file storage system these are usually
   *    only the paths the application is given access to
   */
  abstract listPaths(): string[];
}
