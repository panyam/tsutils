export * from "./types";
export * as Api from "./apis/index";
export * as Constants from "./constants";
export * as Events from "./comms/events";
export * as Lists from "./list";
export * as Misc from "./misc";
export * as Streams from "./streams";
export * as DOM from "./dom";
export * as Num from "./numberutils";
export * as Time from "./timeutils";
// export * as Properties from "./properties";
export * as DAL from "./dal";

export class Browser {
  static IS_EXPLORER = navigator.userAgent.indexOf("MSIE") > -1;
  static IS_FIREFOX = navigator.userAgent.indexOf("Firefox") > -1;
  static IS_OPERA = navigator.userAgent.toLowerCase().indexOf("op") > -1;

  protected static UAHasChrome = navigator.userAgent.indexOf("Chrome") > -1;
  protected static UAHasSafari = navigator.userAgent.indexOf("Safari") > -1;
  static IS_SAFARI = Browser.UAHasSafari && (!Browser.UAHasChrome || !Browser.UAHasSafari);
  static IS_CHROME = Browser.UAHasChrome && (!Browser.UAHasChrome || !Browser.IS_OPERA);
}
