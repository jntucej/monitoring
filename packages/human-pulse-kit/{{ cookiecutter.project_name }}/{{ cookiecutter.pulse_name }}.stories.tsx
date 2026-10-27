import type { Meta, StoryObj } from "@storybook/react";
import { {{ cookiecutter.pulse_name }} } from "./{{ cookiecutter.pulse_name }}";

const meta: Meta<typeof {{ cookiecutter.pulse_name }}> = {
  title: "Shared/{{ cookiecutter.pulse_name }}",
  component: {{ cookiecutter.pulse_name }},
  parameters: { layout: "centered" },
  argTypes: {
    variant: { control: "select", options: ["dot", "badge", "orb"] },
    color:   { control: "select", options: ["mint", "rose", "gold", "sky", "amber", "violet"] },
    size:    { control: { type: "range", min: 4, max: 32, step: 2 } },
    delayMs: { control: { type: "range", min: 0, max: 500, step: 20 } },
  },
  args: {
    variant: "dot",
    color:   "{{ cookiecutter.dot_color }}",
    size:    {{ cookiecutter.dot_size_px }},
    delayMs: 0,
    label:   "live status",
  },
};

export default meta;
type Story = StoryObj<typeof {{ cookiecutter.pulse_name }}>;

export const Default: Story = {};

{% raw %}
export const DotMatrix: Story = {
  render: () => {
    const items = ["mint", "rose", "gold", "sky", "amber", "violet"];
    return (
      <div style={{ display: 'flex', gap: 16, alignItems: 'center' }}>
        {items.map((c, i) => (
          <{{ cookiecutter.pulse_name }} key={c} color={c} delayMs={i * 90} />
        ))}
      </div>
    );
  },
};

export const LiveStatusRow: Story = {
  render: () => {
    return (
      <div style={{ display: 'flex', gap: 8, alignItems: 'center', fontSize: 13 }}>
        <{{ cookiecutter.pulse_name }} color="mint" label="Gates online" />
        <span>6 gates online</span>
      </div>
    );
  },
};
{% endraw %}
