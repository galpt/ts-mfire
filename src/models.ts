export interface Manga {
  title: string;
  url: string;
  cover: string;
}

export class MangaImpl implements Manga {
  constructor(public title: string, public url: string, public cover: string) {}
}
