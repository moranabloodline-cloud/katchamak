// Stable identifiers travel with a saved style, independently of its editable Note title.
export const houseGenres = [
  'Literary Fiction', 'Fantasy', 'Science Fiction', 'Mystery', 'Thriller', 'Suspense',
  'Horror', 'Romance', 'Adventure', 'Historical Fiction', 'Short Stories', 'Poetry',
  'Comics', 'Graphic Novels', "Children's Books", 'Young Adult', 'Biography', 'Memoir',
  'Self-Help', 'Business', 'Investing', 'Academic'
] as const;
export type HouseGenre = typeof houseGenres[number];
