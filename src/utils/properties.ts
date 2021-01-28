import { Nullable } from "../types";
import { EventBus } from "./eventbus";
import { ifDefined } from "./misc";

export class PropertySchema {
  // Name of the property
  public name: string;
  public units = "";
  public defaultValue: any = null;
  public minValue: Nullable<number> = null;
  public maxValue: Nullable<number> = null;
  public beforeSetterName: Nullable<string> = null;

  constructor(name: string, config: any) {
    this.name = name;
    this.beforeSetterName = ifDefined(config.beforeSetterName);
    this.units = ifDefined(config.units);
    this.defaultValue = ifDefined(config.defaultValue);
    this.minValue = ifDefined(config.minValue);
    this.maxValue = ifDefined(config.maxValue);
  }

  validate(newValue: number): boolean {
    if (this.minValue != null && newValue < this.minValue) return false;
    if (this.maxValue != null && newValue > this.maxValue) return false;
    // TODO - other validations
    return true;
  }
}

/**
 * Proprties are values required to fully resolve a component.
 * Like disk needs seek latency or capacity.
 */
export class Property {
  // Value of the property
  readonly schema: PropertySchema;
  public currentValue: any = null;
  public beforeSetterFunc: any = null;

  constructor(schema: PropertySchema) {
    this.schema = schema;
  }

  clone(): Property {
    const out = new Property(this.schema);
    out.currentValue = this.currentValue;
    return out;
  }

  get value() {
    return this.currentValue;
  }

  setValue(instance: any, value: any): boolean {
    if (this.schema.beforeSetterName != null) {
      if (this.beforeSetterFunc == null) {
        const beforeSetterFunc = instance[this.schema.beforeSetterName];
        if (beforeSetterFunc == null) {
          throw new Error("Cannot find beforeSetter function: " + this.schema.beforeSetterName);
        }
        this.beforeSetterFunc = beforeSetterFunc.bind(instance);
      }
      if (this.beforeSetterFunc(value) == false) {
        // validation failed
        return false;
      }
    }
    if (!this.schema.validate(value)) {
      return false;
    }
    this.currentValue = value;
    return true;
  }
}

export class PropertyStore {
  /**
   * The properties for this Element
   */
  readonly __properties__: { [key: string]: Property } = {};

  private eventBus = EventBus.getInstance();

  getPropertyNames(): string[] {
    // return Object.keys((this.constructor as any).__properties__);
    return Object.keys(this.__properties__);
  }

  getProperty(name: string): Nullable<Property> {
    (this as any)[name];
    return this.__properties__[name] || null;
  }

  setProperty(name: string, value: any): void {
    if (this.__properties__[name]) {
      const old = this.__properties__[name].value;
      this.__properties__[name].setValue(this, value);
      // TODO: Maybe need a fully qualified name here.
      this.eventBus.emit("PropertyChange", { name: name, old: old, current: value });
    }
  }
}

export const mixinPropertyStore = (target: any) => {
  return class extends target {
    /**
     * The properties for this Element
     */
    readonly __properties__: { [key: string]: Property } = {};

    getProperties(): { [key: string]: Property } {
      return this.__properties__;
    }

    getProperty(name: string): Property {
      return this.__properties__[name];
    }

    setProperty(name: string, value: any): void {
      if (this.__properties__[name]) {
        this.__properties__[name].setValue(this, value);
      }
    }
  };
};

interface PropertyParams<T> {
  defaultValue?: Nullable<T>;
  propertiesName?: string;
  beforeSetterName?: Nullable<string>;
  units?: string;
  minValue?: Nullable<number>;
  maxValue?: Nullable<number>;
}

function ensureProperty<T>(
  schema: PropertySchema,
  instance: any,
  propertyKey: string,
  propertiesName = "__properties__",
): Property {
  if (!instance[propertiesName]) {
    throw new Error(`Property store (${propertiesName}) does not exist in target.`);
  }
  const propertiesMap = instance[propertiesName];
  if (propertyKey in propertiesMap) {
    return propertiesMap[propertyKey];
  }
  const property = (propertiesMap[propertyKey] = new Property(schema));
  property.setValue(instance, schema.defaultValue);
  return property;
}

/**
 * property is a decorator factory.  It returns a decorator that can be applied to a property.
 * This decorator allows us to have some properties of an Element be treated specially (so it
 * can be reflected, configured/enumerated via UI).  This decorator in a way makes our Element
 * attributes metadata-able so we dont have to duplicate a property object and an attribute
 * manually.
 */
export function property<T>({
  propertiesName = "__properties__",
  defaultValue = null,
  beforeSetterName = null,
  units = "",
  minValue = null,
  maxValue = null,
}: PropertyParams<T> = {}) {
  return function (target: any, propertyKey: string) {
    const root = target; // .constructor;
    if (!(propertiesName in root)) {
      root[propertiesName] = {};
    }
    const propertySchemas = root[propertiesName];
    const newSchema = new PropertySchema(propertyKey, {
      units: units,
      beforeSetterName: beforeSetterName,
      defaultValue: defaultValue,
      minValue: minValue,
      maxValue: maxValue,
    });
    if (propertyKey in propertySchemas) {
      // throw new Error("Duplicate property: " + propertyKey);
    }
    propertySchemas[propertyKey] = newSchema;

    Object.defineProperty(target, propertyKey, {
      get() {
        const property = ensureProperty(newSchema, this, propertyKey, propertiesName);
        return property.value;
      },
      set(newValue: any) {
        const property = ensureProperty(newSchema, this, propertyKey, propertiesName);
        property.setValue(this, newValue);
      },
      enumerable: true,
      configurable: false,
    });
  };
}

export function propertyValidator<T>(propertyName: string, propertiesName = "__properties__") {
  return function (target: any, propertyKey: string, descriptor: PropertyDescriptor) {
    // const property = ensureProperty(this, propertyKey, null, propertiesName);
    // property.setValue(
  };
}
