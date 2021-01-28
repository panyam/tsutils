import { Nullable } from "../types";

type StepFunc = (ts: number) => void;

export class Timer {
  private refreshInterval = 1000;
  private lastRefreshAt = 0;
  private updateLoop: Nullable<number> = null;
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
          } catch (err) {
            console.log("Error from Timer Handler: ", err);
          }
          this.lastRefreshAt = timestamp;
        }
        this.updateLoop = null;
        this.kickOffUpdate();
      }
    });
  }

  /*
  protected step(timestamp: number): void {
    if (this.diagnostics != null) {
      const timetaken = performance.now() - timestamp;
      this.diagnostics.notifyTimeTaken(timetaken, "Total Metrics Update", null);
    }
  }
 */
}
