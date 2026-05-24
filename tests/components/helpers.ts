export const globalStubs = {
  FaIcon: { template: '<span class="fa-icon" />' },
  SecretInput: {
    template: '<div><input :type="masked === false ? \'text\' : \'password\'" :placeholder="placeholder" :value="modelValue" :disabled="disabled" @input="$emit(\'update:modelValue\', $event.target.value)" /><button v-if="suggestedVar" class="use-env-var">use env</button></div>',
    props: ['modelValue', 'placeholder', 'suggestedVar', 'disabled', 'masked'],
    emits: ['update:modelValue'],
  },
  NuxtLink: { template: '<a><slot /></a>', props: ['to'] },
  Teleport: { template: '<div><slot /></div>' },
  VueDraggable: {
    template: '<div class="draggable"><slot /></div>',
    props: ['modelValue', 'disabled', 'group', 'handle', 'animation', 'ghostClass', 'chosenClass', 'itemKey'],
    emits: ['update:modelValue', 'start', 'end'],
  },
  IconPicker: true,
  ServiceCard: { template: '<div class="service-card-stub" />' },
  ServiceModal: true,
  BookmarkModal: true,
  SectionLayoutSettings: { template: '<div class="layout-settings-stub" />' },
  Field: { template: '<div><slot /></div>', props: ['label', 'required'] },
}
