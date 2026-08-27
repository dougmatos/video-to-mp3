/**
 * innertubeClient.ts
 * Fornece uma instância única e compartilhada do cliente Innertube
 * (youtubei.js), usado para buscar informações e baixar áudio do YouTube.
 */

import { Innertube } from 'youtubei.js';

let innertubePromise: Promise<Innertube> | null = null;

/**
 * Retorna uma instância compartilhada do cliente Innertube,
 * criando-a apenas na primeira chamada.
 */
export function getInnertube(): Promise<Innertube> {
  if (!innertubePromise) {
    innertubePromise = Innertube.create().catch((err) => {
      // Permite que uma nova tentativa seja feita em chamadas futuras
      // caso a inicialização falhe.
      innertubePromise = null;
      throw err;
    });
  }
  return innertubePromise;
}
