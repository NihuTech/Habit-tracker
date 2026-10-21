package com.habittracker.config;

import com.habittracker.interceptor.AuthInterceptor;
import org.springframework.context.annotation.Configuration;
import org.springframework.web.servlet.config.annotation.CorsRegistry;
import org.springframework.web.servlet.config.annotation.InterceptorRegistry;
import org.springframework.web.servlet.config.annotation.WebMvcConfigurer;

@Configuration
public class WebConfig implements WebMvcConfigurer {

    private final AuthInterceptor authInterceptor;

    public WebConfig(AuthInterceptor authInterceptor) {
        this.authInterceptor = authInterceptor;
    }

    @Override
    public void addCorsMappings(CorsRegistry registry) {
        registry.addMapping("/**")
                .allowedOrigins("http://localhost:5173")
                .allowedOriginPatterns("*")
                .allowedMethods("GET", "POST", "PATCH", "DELETE", "PUT", "OPTIONS")
                .allowedHeaders("Content-Type", "X-User-Id", "Authorization", "*")
                .exposedHeaders("X-User-Id", "Authorization")
                .allowCredentials(false);
    }

    @Override
    public void addInterceptors(InterceptorRegistry registry) {
        // Protect habit tasks endpoints and habit recovery post endpoints
        registry.addInterceptor(authInterceptor)
                .addPathPatterns("/api/tasks/**", "/api/recovery/*")
                .excludePathPatterns("/api/recovery/suggestions", "/api/recovery/suggestions/**");
    }
}
