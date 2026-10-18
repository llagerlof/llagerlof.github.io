// Music data. Everything here is plain text so tunes are easy to edit.
//
// Time grid: 16 steps per bar (16th notes). Tokens are space-separated; '|' is
// ignored and only helps readability.
//   '.'  rest            '-'  hold the previous note
//
// A section has:
//   chords  one chord per bar, e.g. 'Am F C G' (m, dim, sus4, 5, 7, maj7, m7)
//   bass    a BASS pattern name, or an array with one name per bar (null = silent)
//   arp     an ARP pattern name, or one per bar
//   drums   a DRUMS pattern name, or one per bar
//   lead    one string of 16 note tokens per bar (e.g. 'A4 - C5 -'); ties may cross bars
//   bpm     optional per-section tempo override
//
// A song has: bpm, inst (channel -> instrument in engine.js INST), sections,
// intro (played once), loop (repeats), optional intense (an alternate loop that
// the game switches to at the next section boundary), and once: true for jingles.

// Bass tokens: R root, O root an octave up, F the fifth below the root, 5 the fifth above.
export const BASS = {
  octave: 'R . O . | R . O . | R . O . | R . O .',
  drive:  'R . R O | . R R O | R . R O | . R R O',
  gallop: 'R . R R | R . R R | R . R R | R . R R',
  pump:   'R R O R | R R O R | R R O R | R R O R',
  walk:   'R . . R | . . F . | O . . F | . . R .',
  synco:  'R . . R | . . R . | . R . . | R . O .',
  sparse: 'R - - - | - - - - | F - - - | O - - -',
  whole:  'R - - - | - - - - | - - - - | - - - -',
  end:    'R - - - | - - - - | . . . . | . . . .',
};

// Arp tokens: 0-4 index the chord tones (3 and 4 wrap an octave up), C = the whole chord on the pad.
export const ARP = {
  up16:    '0 1 2 3 | 0 1 2 3 | 0 1 2 3 | 0 1 2 3',
  updown:  '0 1 2 3 | 4 3 2 1 | 0 1 2 3 | 4 3 2 1',
  eighths: '0 . 2 . | 1 . 2 . | 0 . 2 . | 1 . 2 .',
  broken:  '0 . 1 2 | . 3 . 2 | 0 . 1 2 | . 3 2 1',
  pad:     'C - - - | - - - - | - - - - | - - - -',
  stabs:   'C . . C | . . C . | . . C . | C . . .',
};

// Drum tokens combine kit pieces: k kick, s snare, h hat, o open hat, c crash, t/T toms.
export const DRUMS = {
  none:    '. . . . | . . . . | . . . . | . . . .',
  hats:    'h . h . | h . h . | h . h . | h . h .',
  soft:    'k . . . | h . . . | . . k . | h . . .',
  rock:    'k . h . | s . h . | k . k h | s . h .',
  drive:   'kh . h . | sh . h k | kh . h . | sh . h o',
  driveC:  'kc . h . | sh . h k | kh . h . | sh . h o',
  half:    'k . h . | h . h . | s . h . | h . h k',
  halfC:   'kc . h . | h . h . | s . h . | h . h k',
  blast:   'kh h kh h | sh h kh h | kh h kh h | sh h kh sh',
  blastC:  'kc h kh h | sh h kh h | kh h kh h | sh h kh sh',
  fill:    'kh . h . | sh . h . | s s t . | t T s s',
  fillBig: 's . s . | s s t t | T T s s | s s s s',
  build:   'k . . . | k . . . | k . k . | k k k k',
  boom:    'kc . . . | . . . . | k . . . | . . . .',
  end:     'kc . . . | . . . . | . . . . | . . . .',
};

const FILL4 = ['driveC', 'drive', 'drive', 'fill'];
const FILL4B = ['driveC', 'drive', 'drive', 'fillBig'];

export const SONGS = {
  // ---------------------------------------------------------------- TITLE: "Starlight"
  title: {
    bpm: 92,
    inst: { lead: 'softLead', arp: 'arpTri', bass: 'bass', pad: 'pad' },
    sections: {
      P: { chords: 'Am F C G', bass: 'whole', arp: 'pad', drums: 'none' },
      A: {
        chords: 'Am F C G', bass: 'sparse', arp: 'eighths', drums: 'soft',
        lead: [
          'E5 - - - | - - - - | A5 - - - | B5 - C6 -',
          'A5 - - - | - - - - | - - - - | . . . .',
          'G5 - - - | - - - - | E5 - - - | G5 - - -',
          'D5 - - - | - - - - | - - - - | . . . .',
        ],
      },
      B: {
        chords: 'Am F G E', bass: 'sparse', arp: ['eighths', 'eighths', 'eighths', 'pad'], drums: ['soft', 'soft', 'soft', 'hats'],
        lead: [
          'E5 - - - | - - - - | A5 - - - | C6 - D6 -',
          'E6 - - - | - - - - | D6 - C6 - | A5 - - -',
          'B5 - - - | - - - - | G5 - - - | D5 - - -',
          'E5 - - - | G#5 - - - | B5 - - - | . . . .',
        ],
      },
    },
    intro: ['P'],
    loop: ['A', 'B', 'A', 'B', 'P'],
  },

  // ---------------------------------------------------------------- STAGE 1: "Nebula Run"
  stage1: {
    bpm: 144,
    inst: { lead: 'lead25', arp: 'arp', bass: 'bass', pad: 'pad' },
    sections: {
      I: { chords: 'Am Am', bass: 'octave', arp: 'up16', drums: ['hats', 'build'] },
      A: {
        chords: 'Am F C G', bass: 'drive', arp: 'eighths', drums: FILL4,
        lead: [
          'A4 - - - | C5 - E5 - | A5 - - G5 | E5 - - -',
          'F5 - - E5 | C5 - - - | A4 - C5 - | F5 - E5 -',
          'G5 - - - | E5 - C5 - | G4 - C5 - | E5 - G5 -',
          'D5 - - - | B4 - D5 - | G5 - - F5 | D5 - B4 -',
        ],
      },
      B: {
        chords: 'F G Em Am', bass: 'octave', arp: 'up16', drums: FILL4,
        lead: [
          'A5 - - - | - - G5 - | F5 - - - | C5 - - -',
          'B5 - - - | - - A5 - | G5 - - - | D5 - - -',
          'G5 - - - | B5 - - - | E6 - - D6 | B5 - G5 -',
          'A5 - - - | - - - - | E5 - A5 - | C6 - B5 -',
        ],
      },
      C: {
        chords: 'Dm Am Bb E', bass: 'gallop', arp: 'stabs', drums: ['halfC', 'half', 'half', 'fillBig'],
        lead: [
          'D5 - F5 - | A5 - - - | G5 - F5 - | E5 - D5 -',
          'C5 - E5 - | A5 - - - | G5 - E5 - | C5 - - -',
          'D5 - F5 - | Bb5 - - - | A5 - F5 - | D5 - - -',
          'E5 - - - | G#5 - - - | B5 - - - | D6 - B5 G#5',
        ],
      },
    },
    intro: ['I'],
    loop: ['A', 'A', 'B', 'C', 'B'],
  },

  // ---------------------------------------------------------------- STAGE 2: "Hive Pulse"
  stage2: {
    bpm: 152,
    inst: { lead: 'lead12', arp: 'arp', bass: 'bass', pad: 'pad' },
    sections: {
      I: { chords: 'Dm Dm', bass: 'pump', drums: ['build', 'fillBig'] },
      A: {
        chords: 'Dm C Bb A', bass: 'gallop', arp: 'updown', drums: FILL4,
        lead: [
          'D5 - - - | A4 - - - | D5 - E5 - | F5 - - -',
          'E5 - - - | C5 - - - | E5 - F5 - | G5 - - -',
          'F5 - - - | D5 - - - | F5 - G5 - | A5 - - -',
          'A5 - - - | G5 - F5 - | E5 - - - | C#5 - - -',
        ],
      },
      B: {
        chords: 'Gm C F A', bass: 'synco', arp: 'broken', drums: FILL4B,
        lead: [
          'G5 - - - | Bb5 - A5 - | G5 - D5 - | G5 - A5 -',
          'Bb5 - - - | A5 - G5 - | E5 - C5 - | E5 - G5 -',
          'A5 - - - | C6 - A5 - | F5 - A5 - | C6 - - -',
          'C#6 - - - | - - - - | A5 - - - | E5 - C#5 -',
        ],
      },
    },
    intro: ['I'],
    loop: ['A', 'B', 'A', 'B'],
  },

  // ---------------------------------------------------------------- STAGE 3: "Void Drift"
  stage3: {
    bpm: 132,
    inst: { lead: 'lead12', arp: 'arp', bass: 'bass', pad: 'pad' },
    sections: {
      I: { chords: 'Em Em', bass: 'whole', arp: 'pad', drums: ['none', 'build'] },
      A: {
        chords: 'Em C G D', bass: 'walk', arp: 'up16', drums: ['halfC', 'half', 'half', 'fill'],
        lead: [
          'E5 - - - | - - G5 - | F#5 - - - | E5 - D5 -',
          'E5 - - - | - - - - | G5 - - - | C6 - B5 -',
          'B5 - - - | - - A5 - | G5 - - - | D5 - - -',
          'F#5 - - - | A5 - - - | D6 - C6 - | A5 - F#5 -',
        ],
      },
      B: {
        chords: 'Am Em B B', bass: 'drive', arp: 'updown', drums: FILL4B,
        lead: [
          'A5 - - - | C6 - - - | B5 - A5 - | E5 - - -',
          'G5 - - - | B5 - - - | A5 - G5 - | E5 - - -',
          'D#5 - F#5 - | B5 - - - | A5 - - - | F#5 - - -',
          'D#6 - - - | - - - - | B5 - - - | F#5 - D#5 -',
        ],
      },
    },
    intro: ['I'],
    loop: ['A', 'B', 'A', 'B'],
  },

  // ---------------------------------------------------------------- BOSS: "Dreadnought"
  boss: {
    bpm: 168,
    inst: { lead: 'leadSaw', arp: 'arp', bass: 'bassSaw', pad: 'pad' },
    sections: {
      I: { chords: 'Cm Cm', bass: 'pump', drums: ['boom', 'build'] },
      A: {
        chords: 'Cm Cm Ab Bb', bass: 'pump', arp: 'up16', drums: ['blastC', 'blast', 'blast', 'fill'],
        lead: [
          'C5 - C5 - | Eb5 - C5 - | G5 - - F5 | Eb5 - D5 -',
          'C5 - C5 - | Eb5 - G5 - | C6 - - Bb5 | G5 - - -',
          'Ab5 - - G5 | F5 - Eb5 - | C5 - Eb5 - | Ab5 - - -',
          'Bb5 - - Ab5 | G5 - F5 - | D5 - F5 - | Bb5 - D6 -',
        ],
      },
      B: {
        chords: 'Cm Ab Fm G', bass: 'drive', arp: 'stabs', drums: ['halfC', 'half', 'half', 'fillBig'],
        lead: [
          'G5 - - - | - - Eb5 - | C5 - - - | G4 - - -',
          'Ab5 - - - | - - Eb5 - | C5 - - - | Ab4 - - -',
          'F5 - Ab5 - | C6 - - - | Bb5 - Ab5 - | F5 - - -',
          'G5 - - - | B5 - - - | D6 - - - | F6 - D6 B5',
        ],
      },
      // Final phase: faster and higher.
      X: {
        bpm: 178,
        chords: 'Cm Bb Ab G', bass: 'pump', arp: 'updown', drums: ['blastC', 'blast', 'blast', 'fillBig'],
        lead: [
          'C6 - Bb5 - | G5 - C6 - | Eb6 - D6 - | C6 - G5 -',
          'Bb5 - Ab5 - | F5 - Bb5 - | D6 - C6 - | Bb5 - F5 -',
          'Ab5 - G5 - | Eb5 - Ab5 - | C6 - Bb5 - | Ab5 - Eb5 -',
          'G5 - B5 - | D6 - G6 - | F6 - D6 - | B5 - G5 -',
        ],
      },
    },
    intro: ['I'],
    loop: ['A', 'A', 'B', 'A', 'B'],
    intense: ['X', 'X', 'B', 'X'],
  },

  // ---------------------------------------------------------------- JINGLES
  clear: {
    bpm: 150, once: true,
    inst: { lead: 'lead25', arp: 'arp', bass: 'bass', pad: 'pad' },
    sections: {
      S: {
        chords: 'C Bb C', bass: ['octave', 'octave', 'end'], arp: ['up16', 'up16', 'pad'], drums: ['driveC', 'fill', 'end'],
        lead: [
          'G4 - C5 - | E5 - G5 - | C6 - - - | G5 - - -',
          'F5 - Bb5 - | D6 - - - | F6 - - - | D6 - - -',
          'C6 - - - | - - - - | - - - - | . . . .',
        ],
      },
    },
    intro: [],
    loop: ['S'],
  },

  gameover: {
    bpm: 76, once: true,
    inst: { lead: 'softLead', arp: 'arpTri', bass: 'bass', pad: 'pad' },
    sections: {
      S: {
        chords: 'Am Dm E Am', bass: ['whole', 'whole', 'whole', 'end'], arp: 'pad', drums: 'none',
        lead: [
          'E5 - - - | - - - - | C5 - - - | - - - -',
          'D5 - - - | - - - - | A4 - - - | - - - -',
          'B4 - - - | - - - - | G#4 - - - | - - - -',
          'A4 - - - | - - - - | - - - - | . . . .',
        ],
      },
    },
    intro: [],
    loop: ['S'],
  },
};
