import { library } from '@fortawesome/fontawesome-svg-core'
import { FontAwesomeIcon } from '@fortawesome/vue-fontawesome'
import {
  faXmark,
  faCheck,
  faPencil,
  faRotateLeft,
  faRotateRight,
  faRightFromBracket,
  faTableColumns,
  faGripVertical,
  faSliders,
  faImage,
  faEye,
  faEyeSlash,
} from '@fortawesome/free-solid-svg-icons'

library.add(faXmark, faCheck, faPencil, faRotateLeft, faRotateRight, faRightFromBracket, faTableColumns, faGripVertical, faSliders, faImage, faEye, faEyeSlash)

export default defineNuxtPlugin((nuxtApp) => {
  nuxtApp.vueApp.component('FaIcon', FontAwesomeIcon)
})
