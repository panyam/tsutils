import { EntityView } from "./EntityView";
import { StringMap, Nullable } from "../types";

export abstract class ListView<ListEntityType, EntityType = ListEntityType[]> extends EntityView<EntityType> {
  get entities(): ListEntityType[] {
    return (this.entity || []) as ListEntityType[];
  }

  updateViewsFromEntity(previous: Nullable<EntityType>): void {
    super.updateViewsFromEntity(previous);
    this.rootElement.innerHTML = "";
    this.childViews = [];
    const entities = this.entities;
    for (let i = 0; i < entities.length; i++) {
      const child = entities[i];
      let childView: EntityView<ListEntityType>;
      if (i < this.childViewCount) {
        childView = this.childViews[i] as EntityView<ListEntityType>;
      } else {
        childView = this.ensureChildView(i, child, this.rootElement);
        this.addView(childView);
      }
      // set the entity here to refresh
      childView.entity = child;
    }
  }

  /**
   * Ensures we have a child view that exists (by creating if necessary)
   * and added at the right place in the containerView.
   * This is typically called when the list view finds a child view
   * is missing but to be safe this method also must check if a child
   * view already existed even though deleted from the index.
   */
  protected abstract ensureChildView(
    index: number,
    child: ListEntityType,
    container: Element,
  ): EntityView<ListEntityType>;
}
