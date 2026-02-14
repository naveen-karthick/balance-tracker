"use client";

import { useState } from "react";

export default function GopikaValentinePage() {
  const [noCount, setNoCount] = useState(0);
  const [yesPressed, setYesPressed] = useState(false);
  const yesButtonSize = noCount * 20 + 16;

  const handleNoClick = () => {
    setNoCount(noCount + 1);
  };

  const phrases = [
    "No",
    "Are you sure?",
    "What if I asked really nicely?",
    "Pretty please",
    "With a chocolate rice cake on top",
    "What about a matcha frostie",
    "PLEASE GOPIKA",
    "But :*(",
    "I am going to die",
    "Yep im dead",
    "ok ur talking to Naveen's ghost",
    "please babe",
    ":((((",
    "PRETTY PLEASE",
    "Estoy muerto",
    "No :(",
  ];

  const getNoButtonText = () => {
    return phrases[Math.min(noCount, phrases.length - 1)];
  };

  const isLastNo = noCount >= phrases.length - 1;

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-gradient-to-b from-rose-100 to-pink-200 p-4">
      {yesPressed ? (
        <>
          <img
            src="https://media.tenor.com/gUiu1zyxfzYAAAAi/bear-kiss-bear-kisses.gif"
            alt="Bear kisses"
            className="rounded-lg shadow-lg"
          />
          <div className="my-6 text-3xl md:text-4xl font-bold text-rose-700 text-center">
            WOOOOOO!!! I love you Gopika!! ;))
          </div>
        </>
      ) : (
        <>
          <img
            className="h-[200px] rounded-lg object-contain shadow-md"
            src="https://gifdb.com/images/high/cute-love-bear-roses-ou7zho5oosxnpo6k.gif"
            alt="Cute bear with roses"
          />
          <h1 className="my-6 text-3xl md:text-4xl font-bold text-rose-800 text-center px-2">
            Gopika, will you be my Valentine?
          </h1>
          <div className="flex flex-wrap items-center justify-center gap-4">
            <button
              className="rounded-lg bg-green-500 px-6 py-3 font-bold text-white hover:bg-green-600 active:scale-95 transition-all shadow-md"
              style={{ fontSize: Math.min(yesButtonSize, 32) }}
              onClick={() => setYesPressed(true)}
            >
              Yes
            </button>
            {!isLastNo && (
              <button
                onClick={handleNoClick}
                className="rounded-lg bg-red-500 px-6 py-3 font-bold text-white hover:bg-red-600 active:scale-95 transition-all shadow-md min-w-[120px]"
              >
                {noCount === 0 ? "No" : getNoButtonText()}
              </button>
            )}
          </div>
          {isLastNo && (
            <p className="mt-4 text-lg text-rose-700 font-medium">
              you ran out of options now :p
            </p>
          )}
        </>
      )}
    </div>
  );
}
