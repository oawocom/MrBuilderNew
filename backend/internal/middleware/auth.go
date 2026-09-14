package middleware

import (
"net/http"
"strings"

"github.com/gin-gonic/gin"
"github.com/mrbuilder/backend/internal/utils"
)

func AuthRequired(jwtSecret string) gin.HandlerFunc {
return func(c *gin.Context) {
header := c.GetHeader("Authorization")
if header == "" || !strings.HasPrefix(header, "Bearer ") {
utils.Error(c, http.StatusUnauthorized, "Missing or invalid token")
c.Abort()
return
}

claims, err := utils.ValidateToken(strings.TrimPrefix(header, "Bearer "), jwtSecret)
if err != nil {
utils.Error(c, http.StatusUnauthorized, "Invalid or expired token")
c.Abort()
return
}

c.Set("user_id", claims.UserID)
c.Set("user_role", claims.Role)
c.Next()
}
}

func RoleRequired(roles ...string) gin.HandlerFunc {
return func(c *gin.Context) {
userRole := c.GetString("user_role")
for _, r := range roles {
if userRole == r {
c.Next()
return
}
}
utils.Error(c, http.StatusForbidden, "Insufficient permissions")
c.Abort()
}
}
