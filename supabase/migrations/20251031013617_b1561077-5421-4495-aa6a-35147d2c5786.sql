-- Enable realtime for conversations table (messages already enabled)
ALTER PUBLICATION supabase_realtime ADD TABLE public.conversations;