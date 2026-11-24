// Examples mirror the public level fixtures in docs/specs/levels.
export const levelExamples = {
  fit: {
    summary: 'Hexa Fit',
    value: {
      schemaVersion: 1,
      id: 'fit-003',
      gameId: 'hexa-fit',
      order: 3,
      name: {
        es: 'El panal',
        en: 'The honeycomb',
      },
      board: {
        topology: 'hex-axial',
        cells: [
          [0, 0],
          [1, 0],
          [0, 1],
          [-1, 1],
          [-1, 0],
          [0, -1],
          [1, -1],
        ],
      },
      fit: {
        pieces: [
          {
            id: 'p1',
            cells: [
              [0, 0],
              [1, 0],
              [0, 1],
            ],
          },
          {
            id: 'p2',
            cells: [
              [0, 0],
              [1, 0],
            ],
          },
          {
            id: 'p3',
            cells: [
              [0, 0],
              [0, 1],
            ],
          },
        ],
        stars: [
          {
            stars: 3,
            maxMoves: 3,
            maxSeconds: 30,
          },
          {
            stars: 2,
            maxMoves: 6,
            maxSeconds: 90,
          },
        ],
      },
    },
  },
  sort: {
    summary: 'Hexa Sort',
    value: {
      schemaVersion: 1,
      id: 'sort-001',
      gameId: 'hexa-sort',
      order: 1,
      name: {
        es: 'Primeros colores',
        en: 'First colours',
      },
      board: {
        topology: 'hex-axial',
        cells: [
          [-2, 0],
          [-2, 1],
          [-2, 2],
          [-1, -1],
          [-1, 0],
          [-1, 1],
          [-1, 2],
          [0, -2],
          [0, -1],
          [0, 0],
          [0, 1],
          [0, 2],
          [1, -2],
          [1, -1],
          [1, 0],
          [1, 1],
          [2, -2],
          [2, -1],
          [2, 0],
        ],
      },
      sort: {
        goal: {
          clearedStacks: 3,
        },
        colors: ['tone-1', 'tone-2', 'tone-3'],
        stackHeight: {
          min: 2,
          max: 5,
        },
        seed: 42,
      },
    },
  },
};
