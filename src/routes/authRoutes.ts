import { Router } from "express";
import { AuthService } from "../services/AuthService.js";
import { UserRepository } from "../interfaces/UserRepository.js";
import { AuthRequest, authRequired } from "../middleware/auth.js";

export function buildAuthRoutes(
  authService: AuthService,
  userRepository: UserRepository
): Router {
  const router = Router();

  router.post("/register", async (req, res) => {
    try {
      const user = await authService.register(req.body);
      res.status(201).json({
        id: user.id,
        name: user.name,
        email: user.email,
        phone: user.phone,
        role: user.role
      });
    } catch (error) {
      res.status(400).json({ message: (error as Error).message });
    }
  });

  router.post("/login", async (req, res) => {
    try {
      const { token, user } = await authService.login(req.body);
      res.json({
        token,
        user: {
          id: user.id,
          name: user.name,
          email: user.email,
          phone: user.phone,
          role: user.role
        }
      });
    } catch (error) {
      res.status(401).json({ message: (error as Error).message });
    }
  });

  router.get("/me", authRequired, async (req: AuthRequest, res) => {
    try {
      const userId = req.user?.id;
      if (!userId) {
        res.status(401).json({ message: "Unauthorized" });
        return;
      }
      const user = await userRepository.findUserById(userId);
      if (!user) {
        res.status(404).json({ message: "User not found" });
        return;
      }
      res.json({
        id: user.id,
        name: user.name,
        email: user.email,
        phone: user.phone,
        role: user.role
      });
    } catch (error) {
      res.status(500).json({ message: (error as Error).message });
    }
  });

  return router;
}
