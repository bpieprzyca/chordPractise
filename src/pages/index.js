import React, { useState } from 'react';
import classNames from 'classnames';

import _find from 'lodash/find';
import _random from 'lodash/random';
import _get from 'lodash/get';
import _every from 'lodash/every';
import _includes from 'lodash/includes';

import './styles.css';

const playNote = (midi, audioContext) => {
  const oscillator = audioContext.createOscillator();
  const gainNode = audioContext.createGain();

  oscillator.frequency.setTargetAtTime(440, audioContext.currentTime, 0);
  gainNode.gain.setValueAtTime(0.5, audioContext.currentTime);

  gainNode.connect(audioContext.destination);
  oscillator.connect(gainNode);

  oscillator.frequency.setTargetAtTime(
    2 ** ((midi - 69) / 12) * 440,
    audioContext.currentTime,
    0,
  );
  oscillator.start(0);
  gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 1.5);
  oscillator.stop(audioContext.currentTime + 1);
};

const soundTypes = ['main', 'flat', 'sharp', 'doubleFlat', 'doubleSharp'];

const chordTypes = ['maj', 'min', 'dim', 'aug', '7'];

const chordOffsets = {
  [chordTypes[0]]: [4, 7],
  [chordTypes[1]]: [3, 7],
  [chordTypes[2]]: [3, 6],
  [chordTypes[3]]: [4, 8],
  [chordTypes[4]]: [4, 7, 10],
};

const getSounds = (name, pitch) => ({
  [soundTypes[3]]: {
    name: `${name}bb`,
    pitch: pitch - 2,
  },
  [soundTypes[1]]: {
    name: `${name}b`,
    pitch: pitch - 1,
  },
  [soundTypes[0]]: {
    name,
    pitch,
  },
  [soundTypes[2]]: {
    name: `${name}#`,
    pitch: pitch + 1,
  },
  [soundTypes[4]]: {
    name: `${name}##`,
    pitch: pitch + 2,
  },
});

const getNote = (sounds, startingNote, orderOffset, pitchOffset) => {
  const noteOrder = (startingNote.order + orderOffset) % 7;
  const notePitch = startingNote.pitch + pitchOffset;
  const note = _get(
    _find(
      sounds[noteOrder],
      (el) => el.pitch === notePitch || el.pitch === (notePitch - 12),
    ), 'name', '',
  );

  return note;
};

const getChord = (sounds, startingNote, offsets) => offsets
  .map((el, index) => (getNote(sounds, startingNote, (index + 1) * 2, el)));

const getRandomChord = (sounds) => {
  const randomSoundOrder = _random(6);
  const chordType = chordTypes[_random(4)];
  const randomOffsets = chordOffsets[chordType];
  const randomSoundType = soundTypes[_random(1, 2)];
  const firstNotePitch = sounds[randomSoundOrder][randomSoundType].pitch;
  const firstNoteName = sounds[randomSoundOrder][randomSoundType].name;

  return ({
    chordType,
    firstNoteName,
    firstNotePitch,
    restNotes: getChord(sounds, { order: randomSoundOrder, pitch: firstNotePitch }, randomOffsets),
  });
};

export default function Home() {
  const [currentSound, setSound] = useState(null);
  const [currentChordType, setChordType] = useState(null);
  const [currentChordNotes, setChordNotes] = useState([]);
  const [selectedSounds, setSelected] = useState([]);
  const [modal, setModal] = useState(false);

  const audioContext = typeof window !== 'undefined' && new AudioContext();
  const sounds = [
    {
      name: 'C',
      pitch: 2,
    },
    {
      name: 'D',
      pitch: 4,
    },
    {
      name: 'E',
      pitch: 6,
    },
    {
      name: 'F',
      pitch: 7,
    },
    {
      name: 'G',
      pitch: 9,
    },
    {
      name: 'A',
      pitch: 11,
    },
    {
      name: 'B',
      pitch: 13,
    },
  ].map((el) => getSounds(el.name, el.pitch));

  const onRandomButtonClick = () => {
    const randomChord = getRandomChord(sounds);
    if (audioContext) {
      playNote(58 + randomChord.firstNotePitch, audioContext);
    }
    setSound(randomChord.firstNoteName);
    setChordType(randomChord.chordType);
    setChordNotes([...randomChord.restNotes, randomChord.firstNoteName]);
    setSelected([randomChord.firstNoteName]);
  };

  if (typeof document !== 'undefined') {
    document.onkeyup = (event) => {
      if (event.code === 'Space') {
        onRandomButtonClick();
      }
    };
  }

  const onNoteClick = ({ name, pitch }) => {
    const isSelected = selectedSounds.indexOf(name) > -1;
    let newSelected = selectedSounds;
    if (isSelected) {
      newSelected = selectedSounds.filter((el) => el !== name);
    } else {
      newSelected = [...selectedSounds, name];
    }
    setSelected(newSelected);

    if (_includes([...currentChordNotes, currentSound], name) && audioContext) {
      playNote(58 + pitch, audioContext);
    }

    const allSelected = _every(currentChordNotes, (item) => _includes(newSelected, item))
      && _every(newSelected, (item) => _includes(currentChordNotes, item));
    if (allSelected) {
      setModal(true);
      setTimeout(() => {
        setModal(false);
        onRandomButtonClick();
      }, 2000);
    }
  };

  return (
    <div>
      <div className="randomButton" onClick={onRandomButtonClick}>Generate</div>
      <div className="chordName">
        {currentSound && currentChordType && `${currentSound}${currentChordType}`}
      </div>
      <div>
        <p>
          <input type="checkbox" name="main" />
          mainSound
        </p>
      </div>
      <div className="buttonsWrapper">
        {
          sounds.map(
            (sound) => (
              <div className="column" key={sound[soundTypes[0]].name}>
                {
                  Object.keys(sound).map((key) => (
                    <div
                      className={
                        classNames(
                          'optionWrapper',
                          {
                            selected: selectedSounds.indexOf(sound[key].name) > -1,
                            selectedWrong:
                              selectedSounds.indexOf(sound[key].name) > -1
                              && currentChordNotes.indexOf(sound[key].name) === -1,
                            selectedCorrect:
                              (selectedSounds.indexOf(sound[key].name) > -1
                              && currentChordNotes.indexOf(sound[key].name) > -1),
                          },
                        )
                      }
                      key={sound[key].name}
                      onClick={() => onNoteClick(sound[key])}
                    >
                      {sound[key].name}
                    </div>
                  ))
                }
              </div>
            ),
          )
        }
      </div>
      <div className={classNames({ overlay: !!modal })} />
      {
        modal && (
          <div className="modal">
            <p className="successLiteral">
              Sukces!!
            </p>
          </div>
        )
      }
    </div>
  );
}
