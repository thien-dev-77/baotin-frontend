// The installed package exports its runtime but omits the `types` export.
// Reuse its shipped declarations without changing runtime module resolution.
declare module "@splidejs/react-splide" {
  export const Splide: typeof import("../node_modules/@splidejs/react-splide/dist/types/index").Splide;
  export const SplideSlide: typeof import("../node_modules/@splidejs/react-splide/dist/types/index").SplideSlide;
  export const SplideTrack: typeof import("../node_modules/@splidejs/react-splide/dist/types/index").SplideTrack;
}
