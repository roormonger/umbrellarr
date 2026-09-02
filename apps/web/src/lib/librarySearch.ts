export type LibrarySearch = {
  instance: string | undefined;
};

export function librarySearch(instance?: string): LibrarySearch {
  return { instance };
}

export const allLibrarySearch: LibrarySearch = { instance: undefined };
