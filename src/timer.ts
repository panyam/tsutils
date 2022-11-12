type StepFunc = (ts: number) => void;

export default class Timer {
  private refreshInterval = 1000;
  private lastRefreshAt = 0;
  private updateLoop: number | null = null;
  stepFunc: StepFunc;

  constructor(refreshInterval: number, stepFunc: StepFunc) {
    this.refreshInterval = refreshInterval;
    this.stepFunc = stepFunc;
  }

  stop(): void {
    if (this.updateLoop != null) {
      cancelAnimationFrame(this.updateLoop);
      this.updateLoop = null;
    }
  }

  start(): void {
    this.kickOffUpdate();
  }

  protected kickOffUpdate(): void {
    if (this.updateLoop != null) {
      cancelAnimationFrame(this.updateLoop);
    }
    this.updateLoop = requestAnimationFrame((timestamp) => {
      if (this.updateLoop != null) {
        if (timestamp - this.lastRefreshAt >= this.refreshInterval) {
          try {
            this.stepFunc(timestamp);
          } catch (err: any) {
            console.log("Error from Timer Handler: ", err);
            alert("Error from Timer Handler: " + err.message);
            return;
          }
          this.lastRefreshAt = timestamp;
        }
        this.updateLoop = null;
        this.kickOffUpdate();
      }
    });
  }
}
