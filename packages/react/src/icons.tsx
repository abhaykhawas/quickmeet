import type { SVGProps } from 'react';

type IconProps = SVGProps<SVGSVGElement>;

function IconBase({ children, ...props }: IconProps) {
  return (
    <svg
      viewBox="0 0 24 24"
      width="20"
      height="20"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      {...props}
    >
      {children}
    </svg>
  );
}

export const MicIcon = (props: IconProps) => (
  <IconBase {...props}>
    <rect x="9" y="3" width="6" height="12" rx="3" />
    <path d="M5.5 11.5a6.5 6.5 0 0 0 13 0M12 18v3M8.5 21h7" />
  </IconBase>
);

export const MicOffIcon = (props: IconProps) => (
  <IconBase {...props}>
    <path d="m3 3 18 18M9 5.5V12a3 3 0 0 0 4.8 2.4M15 10.5V6a3 3 0 0 0-5.1-2.1M5.5 11.5a6.5 6.5 0 0 0 10.8 4.9M18.5 11.5a6.5 6.5 0 0 1-.5 2.5M12 18v3M8.5 21h7" />
  </IconBase>
);

export const CameraIcon = (props: IconProps) => (
  <IconBase {...props}>
    <rect x="3" y="6.5" width="13" height="11" rx="2" />
    <path d="m16 10 5-2.5v9L16 14" />
  </IconBase>
);

export const CameraOffIcon = (props: IconProps) => (
  <IconBase {...props}>
    <path d="m3 3 18 18M10.5 6.5H5a2 2 0 0 0-2 2v7a2 2 0 0 0 2 2h11M16 10l5-2.5v9l-2.5-1.25M14 6.5a2 2 0 0 1 2 2V14" />
  </IconBase>
);

export const ScreenIcon = (props: IconProps) => (
  <IconBase {...props}>
    <rect x="3" y="4" width="18" height="13" rx="2" />
    <path d="M8 21h8M12 17v4M9 9l3-3 3 3M12 6v7" />
  </IconBase>
);

export const ChatIcon = (props: IconProps) => (
  <IconBase {...props}>
    <path d="M20 14a3 3 0 0 1-3 3H9l-5 4v-4a3 3 0 0 1-2-3V6a3 3 0 0 1 3-3h12a3 3 0 0 1 3 3Z" />
  </IconBase>
);

export const PeopleIcon = (props: IconProps) => (
  <IconBase {...props}>
    <circle cx="9" cy="8" r="3" />
    <path d="M3 20a6 6 0 0 1 12 0M16 4.5a3 3 0 0 1 0 5.8M17 14a5 5 0 0 1 4 4.9" />
  </IconBase>
);

export const LinkIcon = (props: IconProps) => (
  <IconBase {...props}>
    <path d="M10 13a5 5 0 0 0 7.5.5l2-2a5 5 0 0 0-7-7l-1.2 1.2M14 11a5 5 0 0 0-7.5-.5l-2 2a5 5 0 0 0 7 7l1.2-1.2" />
  </IconBase>
);

export const PhoneIcon = (props: IconProps) => (
  <IconBase {...props}>
    <path d="M4.5 5.5c0 7.7 6.3 14 14 14l2-4.1-4.5-2-1.7 2a11 11 0 0 1-5.7-5.7l2-1.7-2-4.5Z" />
  </IconBase>
);

export const SendIcon = (props: IconProps) => (
  <IconBase {...props}>
    <path d="m21 3-8.5 18-2.3-7.2L3 11.5ZM10.2 13.8 21 3" />
  </IconBase>
);

export const CloseIcon = (props: IconProps) => (
  <IconBase {...props}>
    <path d="m6 6 12 12M18 6 6 18" />
  </IconBase>
);
