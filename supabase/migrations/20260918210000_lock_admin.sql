-- Garante que o email administrativo definido é sempre administrador e
-- ativo, e impede que seja alterado ou eliminado a partir da aplicação
-- (mesmo por outro administrador, por engano ou clique errado).

CREATE OR REPLACE FUNCTION public.protege_admin_fixo() RETURNS trigger AS $$
BEGIN
    IF TG_OP = 'DELETE' THEN
        IF lower(OLD.email) = 'pedro.mf.santos@outlook.pt' THEN
            RAISE EXCEPTION 'Este operador não pode ser eliminado.';
        END IF;
        RETURN OLD;
    END IF;

    IF lower(NEW.email) = 'pedro.mf.santos@outlook.pt' THEN
        NEW.perfil := 'administrador';
        NEW.ativo := true;
        -- também impede mudar o email desta conta para outro
        NEW.email := 'pedro.mf.santos@outlook.pt';
    END IF;
    RETURN NEW;
END $$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

CREATE TRIGGER tg_protege_admin_fixo
BEFORE INSERT OR UPDATE OR DELETE ON operador
FOR EACH ROW EXECUTE FUNCTION public.protege_admin_fixo();

-- Garante desde já que a conta existe e está correta.
INSERT INTO operador (nome, email, perfil, ativo)
VALUES ('Pedro Santos', 'pedro.mf.santos@outlook.pt', 'administrador', true)
ON CONFLICT (email) DO UPDATE SET perfil = 'administrador', ativo = true;
