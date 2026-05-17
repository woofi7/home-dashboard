export const globalStubs = {
  FaIcon: { template: '<span class="fa-icon" />' },
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
