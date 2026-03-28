/// <reference types="vite/client" />

declare module "plotly.js-dist-min" {
  /** Same API as the `plotly.js` package; types come from `@types/plotly.js`. */
  import type * as PlotlyModule from "plotly.js";
  const Plotly: typeof PlotlyModule;
  export default Plotly;
}
