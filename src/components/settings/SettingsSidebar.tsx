import { Link, useLocation } from 'react-router-dom';
import { cn } from '@/lib/utils';
import {
  Building2,
  MessageSquare,
  Users,
  CreditCard,
  ChevronRight,
  Plug,
} from 'lucide-react';
import { useState } from 'react';

interface SettingsNavItem {
  title: string;
  href: string;
  icon: React.ComponentType<{ className?: string }>;
  children?: SettingsNavItem[];
}

const settingsNav: SettingsNavItem[] = [
  {
    title: 'General',
    href: '/settings',
    icon: Building2,
  },
  {
    title: 'Integrations',
    href: '/settings/integrations',
    icon: Plug,
  },
  {
    title: 'WhatsApp',
    href: '/settings/whatsapp',
    icon: MessageSquare,
    children: [
      { title: 'Connection', href: '/settings/whatsapp/connection', icon: MessageSquare },
      { title: 'Phone Numbers', href: '/settings/whatsapp/numbers', icon: MessageSquare },
      { title: 'Templates', href: '/settings/whatsapp/templates', icon: MessageSquare },
      { title: 'Messaging Rules', href: '/settings/whatsapp/rules', icon: MessageSquare },
      { title: 'Webhooks', href: '/settings/whatsapp/webhooks', icon: MessageSquare },
      { title: 'Compliance', href: '/settings/whatsapp/compliance', icon: MessageSquare },
    ],
  },
  {
    title: 'Team & Access',
    href: '/settings/team',
    icon: Users,
  },
  {
    title: 'Billing',
    href: '/settings/billing',
    icon: CreditCard,
  },
];

export function SettingsSidebar() {
  const location = useLocation();
  const [expandedSections, setExpandedSections] = useState<string[]>(['WhatsApp']);

  const toggleSection = (title: string) => {
    setExpandedSections(prev =>
      prev.includes(title)
        ? prev.filter(t => t !== title)
        : [...prev, title]
    );
  };

  const isActive = (href: string) => {
    if (href === '/settings') {
      return location.pathname === '/settings';
    }
    return location.pathname.startsWith(href);
  };

  return (
    <aside className="w-64 border-r bg-background h-full overflow-y-auto">
      <div className="p-6">
        <h2 className="text-lg font-semibold mb-1">Settings</h2>
        <p className="text-sm text-muted-foreground">Manage your workspace</p>
      </div>

      <nav className="space-y-1 px-3 pb-6">
        {settingsNav.map((item) => {
          const Icon = item.icon;
          const hasChildren = item.children && item.children.length > 0;
          const isExpanded = expandedSections.includes(item.title);
          const active = isActive(item.href);

          return (
            <div key={item.title}>
              <Link
                to={item.href}
                onClick={(e) => {
                  if (hasChildren) {
                    e.preventDefault();
                    toggleSection(item.title);
                  }
                }}
                className={cn(
                  'flex items-center gap-3 rounded-lg px-3 py-2 text-sm transition-colors',
                  active
                    ? 'bg-primary/10 text-primary font-medium'
                    : 'text-muted-foreground hover:bg-accent hover:text-accent-foreground'
                )}
              >
                <Icon className="h-4 w-4" />
                <span className="flex-1">{item.title}</span>
                {hasChildren && (
                  <ChevronRight
                    className={cn(
                      'h-4 w-4 transition-transform',
                      isExpanded && 'rotate-90'
                    )}
                  />
                )}
              </Link>

              {hasChildren && isExpanded && (
                <div className="ml-7 mt-1 space-y-1">
                  {item.children.map((child) => (
                    <Link
                      key={child.href}
                      to={child.href}
                      className={cn(
                        'block rounded-lg px-3 py-2 text-sm transition-colors',
                        isActive(child.href)
                          ? 'bg-primary/10 text-primary font-medium'
                          : 'text-muted-foreground hover:bg-accent hover:text-accent-foreground'
                      )}
                    >
                      {child.title}
                    </Link>
                  ))}
                </div>
              )}
            </div>
          );
        })}
      </nav>
    </aside>
  );
}
