declare let navigator: any;
export class Browser {
  static IS_EXPLORER = () => navigator && navigator.userAgent.indexOf("MSIE") > -1;
  static IS_FIREFOX = () => navigator && navigator.userAgent.indexOf("Firefox") > -1;
  static IS_OPERA = () => navigator && navigator.userAgent.toLowerCase().indexOf("op") > -1;

  protected static UAHasChrome = () => navigator && navigator.userAgent.indexOf("Chrome") > -1;
  protected static UAHasSafari = () => navigator && navigator.userAgent.indexOf("Safari") > -1;
  static IS_SAFARI = () => navigator && Browser.UAHasSafari && (!Browser.UAHasChrome || !Browser.UAHasSafari);
  static IS_CHROME = () => navigator && Browser.UAHasChrome && (!Browser.UAHasChrome || !Browser.IS_OPERA);
}
