import { isEmpty, isTextIncludes } from './condition'
import { handleWarningLog } from './error'
import { blobToBase64, urlToImageElement, transformFileSize } from './image'

interface BaseValidateOption<M> {
  message?: string;
  messageOption?: Record<keyof M,string>;
}

export type ValidateOption<V> = V & BaseValidateOption<V>

type StringResult = string | string[] | null

type ValidatorHandlerResult = Promise<StringResult> | StringResult

export type ValidatorHandler = (value: unknown, option?: ValidateOption<never>) => ValidatorHandlerResult 

function isEmptyValidator(value: unknown, option?: ValidateOption<BaseValidateOption<never>>): string | null {
  const optionDefault = {
    message: ''
  }
  const opt = option || optionDefault
  return isEmpty(value) ? opt.message || '輸入資料不得為空' : null
}

function emailValidator (value: unknown, option?: ValidateOption<BaseValidateOption<never>>): string | null {
  const optionDefault = {
    message: ''
  }
  const opt = option || optionDefault
  const reg =
    /^(([^<>()[\]\\.,;:\s@"]+(\.[^<>()[\]\\.,;:\s@"]+)*)|(".+"))@((\[[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\])|(([a-zA-Z\-0-9]+\.)+[a-zA-Z]{2,}))$/
  const result = !reg.test(String(value))
  return result ? opt.message || '請輸入正確的電子郵件信箱格式' : null
}

interface PasswordValidateOption {
  min?: number;
  max?: number;
}

function passwordValidator (value: unknown, option?: ValidateOption<PasswordValidateOption>): string | null {
  const optionDefault = {
    min: 6,
    max: 30,
    message: ''
  }
  const opt = option || optionDefault
  const min = opt.min || optionDefault.min
  const max = opt.max || optionDefault.max
  const reg = new RegExp(`^(?=.*\\d)(?=.*[a-zA-Z]).{${min},${max}}$`)
  const result = !reg.test(String(value))
  return result ? opt.message || `密碼請輸入${min}~${max}碼英數混合` : null 
}

function equalValidator (value: unknown, option?: ValidateOption<{ equal: string }>): string | null {
  const optionDefault = {
    equal: '',
    message: ''
  }
  const opt = option || optionDefault
  return opt.equal !== value ? opt.message || '輸入資料不相等' : null
}

interface BlobOption {
  size?: number;
  type?: string;
}

interface FileOption extends BlobOption {
  name?: string;
}

interface ImageOption extends FileOption {
  minWidth?: number;
  maxWidth?: number;
  minHeight?: number;
  maxHeight?: number;
}
  
async function imageValidator (value: unknown, option?: ValidateOption<ImageOption>): Promise<string[] | null> {
  const optionDefault = {
    messageOption: {
      minWidth: '圖片寬度大小低於限制',
      maxWidth: '圖片寬度大小超出限制',
      minHeight: '圖片高度大小低於限制',
      maxHeight: '圖片高度大小超出限制',
      size: '檔案大小超出限制',
      type: '檔案類型錯誤', 
    },
    message: '',
    minWidth: 0,
    maxWidth: 0,
    minHeight: 0,
    maxHeight: 0,
    size: 0,
    type: 'image',
  }
  const opt = option || optionDefault
  const errors: string[] = []
  if (value instanceof Blob) {
    if (opt.minWidth || opt.maxWidth || opt.minHeight || opt.maxHeight) {
      const base64Url = await blobToBase64(value)
      const img = await urlToImageElement(base64Url)
      if (opt.minWidth && opt.minWidth < img.naturalWidth) {
        errors.push(opt.messageOption?.minWidth || optionDefault.messageOption.maxWidth)
      }
      if (opt.maxWidth && opt.maxWidth > img.naturalWidth) {
        errors.push(opt.messageOption?.maxWidth || optionDefault.messageOption.minWidth)
      }
      if (opt.minHeight && opt.minHeight < img.naturalHeight) {
        errors.push(opt.messageOption?.minHeight || optionDefault.messageOption.minHeight)
      }
      if (opt.maxHeight && opt.maxHeight > img.naturalHeight) {
        errors.push(opt.messageOption?.maxHeight || optionDefault.messageOption.maxHeight)
      }
    }
    if (opt.size) {
      const sizeNumber = transformFileSize(opt.size)
      if (isNaN(sizeNumber)) {
        handleWarningLog('utils[function validImage]: The option property size is not valid variable.')
      } else {
        if (value.size > sizeNumber) {
          errors.push(opt.messageOption?.size || optionDefault.messageOption.size)
        }
      }
    }
    if (opt.type) {
      const allowedTypes = typeof opt.type === 'string' ? opt.type.split(',') : Array.from(opt.type)
      const types = allowedTypes.map((v) => String(v).toLocaleLowerCase())
      const isAllowed = isTextIncludes(types, value.type.toLocaleLowerCase())
      if (!isAllowed) {
        errors.push(opt.messageOption?.type || optionDefault.messageOption.type)
      }
    }
  } else {
    handleWarningLog('utils[function validImage]: The value is not Blob object.')
  }
  return errors.length ? errors : null 
}

interface ValidatorHandlerList {
  [k: string]: ValidatorHandler
}

const validatorHandler: ValidatorHandlerList = {
  isEmpty: isEmptyValidator, 
  email: emailValidator, 
  password: passwordValidator, 
  equal: equalValidator, 
  image: imageValidator, 
}

export type ValidateField<V> = {
  [Type in keyof V]: ValidatorHandlerOption<V[Type]>;
}

export type ValidatorValidOption<M, V> = {
  [K in keyof M]?: ValidateField<V>;
} 

export type ValidatorHandlerOption<F> = F extends (value: unknown, option: infer A) => ValidatorHandlerResult ? A : never

interface ErrorMessages {
  [key: string]: string[] | null;
}

export class Validator<M> {
  public readonly validatorHandler: ValidatorHandlerList = validatorHandler
  private readonly model: M
  private readonly validateOption?: ValidatorValidOption<M,ValidatorHandlerList>
  public readonly errors: { [K in keyof M]?: string[] } = {}

  constructor (model: M, option?: ValidatorValidOption<M, ValidatorHandlerList>) {
    this.model = model
    this.validateOption = option
  }

  async validate(options?: ValidatorValidOption<M,ValidatorHandlerList>): Promise<ErrorMessages> {
    if (isEmpty(this.model)) {
      handleWarningLog('utils[function validate]: The form property is all empty.')
    }
    const opt = options || this.validateOption
    if (isEmpty(opt)) {
      handleWarningLog('utils[function validate]: The options property is all empty.')
    }
    const errors: ErrorMessages = {}
    if (opt) {
      for (const key in this.model) {
        const validateField = opt[key]
        if (Object.hasOwnProperty.call(this.model, key) && validateField) {
          errors[key] = await this.validateField(this.model[key], validateField)
        }
      }
    }
    return errors
  }

  setValidatorHandler(name: string, handler: ValidatorHandler): void {
    this.validatorHandler[name] = handler
  }

  async validateField(value: unknown, options?: ValidateField<ValidatorHandlerList>): Promise<string[] | null> {
    const errors: string[] = []
    if (options) {
      for (const type in options) {
        const typeOption = options[type]
        const handler = this.validatorHandler[type]
        const errorMessages = await handler(value, typeOption)
        if (errorMessages) {
          if (Array.isArray(errorMessages)) {
            errors.push(...errorMessages)
          } else {
            errors.push(errorMessages)
          }
        }
      } 
    } else {
      handleWarningLog('utils[function validateField]: The options type is not a ValidateField.') 
    }
    const result = errors.filter((s) => s)
    return result.length ? result : null
  }

  errorsToArray(): string[] {
    return Object.values(this.errors).flat().filter(p => p).map(String)
  }

  getErrors (): { [K in keyof M]?: string[] } {
    return JSON.parse(JSON.stringify(this.errors))
  }

  isValid(field: keyof M): boolean {
    if (field) {
      const fieldError = this.errors[field]
      return Boolean(Array.isArray(fieldError) && fieldError.length)
    }
    return Boolean(this.errorsToArray().length)
  }
}