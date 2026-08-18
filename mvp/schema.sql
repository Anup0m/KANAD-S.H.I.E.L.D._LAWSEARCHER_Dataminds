-- Enable vector extension
create extension if not exists vector;

-- Create documents table
create table documents (
    id uuid primary key default gen_random_uuid(),
    title text,
    summary_en text,
    content text,
    region text,
    doc_type text,
    source_url text,
    pdf_url text,
    publish_year integer,
    department text,
    keywords text[],
    embedding vector(768), -- Gemini text-embedding-004 is 768 dims
    created_at timestamptz default now()
);

-- Create scrape_log table for tracking cron runs
create table scrape_log (
    id uuid primary key default gen_random_uuid(),
    run_date timestamptz default now(),
    docs_added integer default 0,
    details text
);

-- RLS setup
alter table documents enable row level security;

-- Allow read access to everyone for the MVP search API
create policy "Public read access" on documents for select using (true);
create policy "Allow inserts" on documents for insert with check (true);
create policy "Allow updates" on documents for update using (true) with check (true);

-- Similarity search function
create or replace function match_documents (
  query_embedding vector(768),
  match_threshold float,
  match_count int,
  filter_region text default null,
  filter_doc_type text default null,
  filter_department text default null
) returns table (
  id uuid,
  title text,
  summary_en text,
  content text,
  source_url text,
  pdf_url text,
  publish_year int,
  department text,
  keywords text[],
  similarity float
)
language sql stable
as $$
  select
    documents.id,
    documents.title,
    documents.summary_en,
    documents.content,
    documents.source_url,
    documents.pdf_url,
    documents.publish_year,
    documents.department,
    documents.keywords,
    1 - (documents.embedding <=> query_embedding) as similarity
  from documents
  where 1 - (documents.embedding <=> query_embedding) > match_threshold
    and (filter_region is null or documents.region = filter_region)
    and (filter_doc_type is null or documents.doc_type = filter_doc_type)
    and (filter_department is null or documents.department = filter_department)
  order by documents.embedding <=> query_embedding
  limit match_count;
$$;

-- Create bookmarks table
create table bookmarks (
    id uuid primary key default gen_random_uuid(),
    user_id uuid references auth.users not null,
    document_id uuid references documents not null,
    created_at timestamptz default now(),
    unique (user_id, document_id)
);

-- RLS for bookmarks
alter table bookmarks enable row level security;
create policy "Users can select their own bookmarks" on bookmarks for select using (auth.uid() = user_id);
create policy "Users can insert their own bookmarks" on bookmarks for insert with check (auth.uid() = user_id);
create policy "Users can delete their own bookmarks" on bookmarks for delete using (auth.uid() = user_id);

-- Create search_history table
create table search_history (
    id uuid primary key default gen_random_uuid(),
    user_id uuid references auth.users not null,
    query_text text not null,
    created_at timestamptz default now()
);

-- RLS for search_history
alter table search_history enable row level security;
create policy "Users can view their own search history" on search_history for select using (auth.uid() = user_id);
create policy "Users can insert their own search history" on search_history for insert with check (auth.uid() = user_id);

-- Create user_alerts table
create table user_alerts (
    id uuid primary key default gen_random_uuid(),
    user_id uuid references auth.users not null,
    keyword text not null,
    is_active boolean default true,
    created_at timestamptz default now()
);

-- RLS for user_alerts
alter table user_alerts enable row level security;
create policy "Users can view their own alerts" on user_alerts for select using (auth.uid() = user_id);
create policy "Users can insert their own alerts" on user_alerts for insert with check (auth.uid() = user_id);
create policy "Users can update their own alerts" on user_alerts for update using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "Users can delete their own alerts" on user_alerts for delete using (auth.uid() = user_id);

-- Create search_log table for analytics
create table search_log (
    id uuid primary key default gen_random_uuid(),
    query_text text not null,
    region_filter text,
    doc_type_filter text,
    result_count integer default 0,
    searched_at timestamptz default now()
);
